const Prospect = require("../models/Prospect");
const Notification = require("../models/Notification");
const socket = require("../socket/socketManager");

// ── GET /api/prospects ────────────────────────────────────────────────────────
exports.getProspects = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      source,
      sortBy = "createdAt",
      order = "desc",
      overduFollowUp, // ?overdueFollowUp=true
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (source) query.source = source;

    if (overduFollowUp === "true") {
      query.followUpDate = { $lte: new Date() };
      query.status = { $nin: ["won", "lost"] };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [prospects, total] = await Promise.all([
      Prospect.find(query)
        .populate("contact", "name company email phoneNumber category")
        .populate("assignedTo", "name devID email")
        .populate("markedProspectBy", "name devID")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Prospect.countDocuments(query),
    ]);

    // Summary stats alongside list
    const stats = await Prospect.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$estimatedValue" },
        },
      },
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: prospects.length,
      stats,
      data: prospects,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/prospects/:id ────────────────────────────────────────────────────
exports.getProspect = async (req, res, next) => {
  try {
    const prospect = await Prospect.findById(req.params.id)
      .populate("contact")
      .populate("assignedTo", "name devID email department")
      .populate("markedProspectBy", "name devID")
      .populate("updatedBy", "name devID")
      .populate("activities.performedBy", "name devID");

    if (!prospect) {
      return res.status(404).json({ success: false, message: "Prospect not found" });
    }

    res.json({ success: true, data: prospect });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/prospects/:id ────────────────────────────────────────────────────
//    General update (status, priority, value, dates, assignment, etc.)
exports.updateProspect = async (req, res, next) => {
  try {
    const prospect = await Prospect.findById(req.params.id).populate("contact", "name company");
    if (!prospect) {
      return res.status(404).json({ success: false, message: "Prospect not found" });
    }

    const oldStatus = prospect.status;
    const {
      status,
      priority,
      estimatedValue,
      currency,
      expectedCloseDate,
      followUpDate,
      assignedTo,
      assignedToName,
      source,
      remarks,
      lostReason,
      interestedIn,
    } = req.body;

    // Build update
    const updateFields = {
      ...(priority && { priority }),
      ...(estimatedValue !== undefined && { estimatedValue }),
      ...(currency && { currency }),
      ...(expectedCloseDate && { expectedCloseDate }),
      ...(followUpDate !== undefined && { followUpDate }),
      ...(source && { source }),
      ...(remarks !== undefined && { remarks }),
      ...(lostReason !== undefined && { lostReason }),
      ...(interestedIn && { interestedIn }),
      updatedBy: req.user._id,
      updatedByName: req.user.name,
    };

    // Handle status transition
    if (status && status !== oldStatus) {
      updateFields.status = status;
      if (status === "won" || status === "lost") {
        updateFields.wonLostDate = new Date();
      }

      prospect.activities.push({
        action: "status_changed",
        description: `Status changed from '${oldStatus}' to '${status}'`,
        performedBy: req.user._id,
        performedByName: req.user.name,
        meta: { from: oldStatus, to: status },
      });
    }

    // Handle re-assignment
    if (assignedTo && assignedTo.toString() !== prospect.assignedTo?.toString()) {
      updateFields.assignedTo = assignedTo;
      updateFields.assignedToName = assignedToName || "";

      prospect.activities.push({
        action: "assigned",
        description: `Assigned to ${assignedToName || assignedTo}`,
        performedBy: req.user._id,
        performedByName: req.user.name,
      });

      // Notify assigned user
      const notification = await Notification.create({
        type: "prospect_assigned",
        title: "Prospect Assigned to You",
        message: `${req.user.name} assigned ${prospect.contact.name}'s prospect to you`,
        prospect: prospect._id,
        contact: prospect.contact._id,
        triggeredBy: req.user._id,
        triggeredByName: req.user.name,
        targetUser: assignedTo,
      });

      socket.emitToUser(assignedTo, "notification", notification.toObject());
    }

    Object.assign(prospect, updateFields);
    await prospect.save();

    // Broadcast status change to everyone
    if (status && status !== oldStatus) {
      const notifType =
        status === "won" ? "prospect_won" :
        status === "lost" ? "prospect_lost" :
        "prospect_status_changed";

      const notification = await Notification.create({
        type: notifType,
        title: status === "won" ? "🎉 Prospect Won!" : `Prospect Updated`,
        message: `${req.user.name} changed ${prospect.contact.name}'s prospect status to '${status}'`,
        prospect: prospect._id,
        contact: prospect.contact._id,
        triggeredBy: req.user._id,
        triggeredByName: req.user.name,
      });

      socket.broadcastToAll("notification", {
        ...notification.toObject(),
        contactName: prospect.contact.name,
      });
    }

    const updated = await Prospect.findById(prospect._id)
      .populate("contact", "name company email phoneNumber")
      .populate("assignedTo", "name devID");

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/prospects/:id/add-note ─────────────────────────────────────────
exports.addNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ success: false, message: "Note content is required" });
    }

    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ success: false, message: "Prospect not found" });
    }

    prospect.activities.push({
      action: "note_added",
      description: note,
      performedBy: req.user._id,
      performedByName: req.user.name,
    });

    await prospect.save();

    res.json({ success: true, data: prospect.activities });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/prospects/dashboard ─────────────────────────────────────────────
//    Quick stats for a dashboard widget
exports.getDashboard = async (req, res, next) => {
  try {
    const [byStatus, byPriority, totalValue, overdueFollowUps, recentProspects] =
      await Promise.all([
        Prospect.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$estimatedValue" } } },
          { $sort: { count: -1 } },
        ]),
        Prospect.aggregate([
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
        Prospect.aggregate([
          { $match: { status: { $nin: ["won", "lost"] } } },
          { $group: { _id: null, total: { $sum: "$estimatedValue" } } },
        ]),
        Prospect.countDocuments({
          followUpDate: { $lte: new Date() },
          status: { $nin: ["won", "lost"] },
        }),
        Prospect.find()
          .populate("contact", "name company")
          .sort({ createdAt: -1 })
          .limit(5)
          .select("status priority estimatedValue markedProspectByName createdAt"),
      ]);

    res.json({
      success: true,
      data: {
        byStatus,
        byPriority,
        pipelineValue: totalValue[0]?.total || 0,
        overdueFollowUps,
        recentProspects,
      },
    });
  } catch (err) {
    next(err);
  }
};
