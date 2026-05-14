const Prospect = require("../models/Prospect");
const Contact = require("../models/Contact");

// ── Populate helper ────────────────────────────────────────────────────────────
const PROSPECT_POPULATE = [
  {
    path: "contact",
    select: "name company phoneNumber email category address",
  },
  { path: "assignedTo", select: "devID name email" },
  { path: "createdBy", select: "devID name" },
  { path: "updatedBy", select: "devID name" },
  { path: "remarks.addedBy", select: "devID name" },
];

// @desc    Get all active prospects (visible to all portal users)
// @route   GET /api/prospects
// @access  Private
const getAllProspects = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      source,
      assignedTo,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = { isActive: true };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [prospects, total] = await Promise.all([
      Prospect.find(filter)
        .populate(PROSPECT_POPULATE)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Prospect.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: prospects.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: prospects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single prospect by its ID
// @route   GET /api/prospects/:prospectId
// @access  Private
const getProspectById = async (req, res, next) => {
  try {
    const prospect = await Prospect.findById(req.params.prospectId).populate(
      PROSPECT_POPULATE,
    );

    if (!prospect) {
      return res
        .status(404)
        .json({ success: false, message: "Prospect not found" });
    }

    res.status(200).json({ success: true, data: prospect });
  } catch (error) {
    next(error);
  }
};

// @desc    Update prospect details (status, priority, deal info, etc.)
// @route   PUT /api/prospects/:prospectId
// @access  Private
const updateProspect = async (req, res, next) => {
  try {
    // Disallow changing the linked contact via this route
    const {
      contact: _c,
      createdBy: _cb,
      remarks: _r,
      ...updateFields
    } = req.body;

    updateFields.updatedBy = req.user._id;

    const prospect = await Prospect.findByIdAndUpdate(
      req.params.prospectId,
      { $set: updateFields },
      { new: true, runValidators: true },
    ).populate(PROSPECT_POPULATE);

    if (!prospect) {
      return res
        .status(404)
        .json({ success: false, message: "Prospect not found" });
    }

    // Notify all clients of the update
    const io = req.app.get("io");
    if (io) {
      io.emit("prospect:updated", {
        message: `Prospect updated by ${req.user.name}`,
        updatedBy: {
          _id: req.user._id,
          name: req.user.name,
          devID: req.user.devID,
        },
        prospect,
      });
    }

    res.status(200).json({
      success: true,
      message: "Prospect updated successfully",
      data: prospect,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a remark / activity log entry to a prospect
// @route   POST /api/prospects/:prospectId/remarks
// @access  Private
const addRemark = async (req, res, next) => {
  try {
    const { text } = req.body;

    const prospect = await Prospect.findByIdAndUpdate(
      req.params.prospectId,
      {
        $push: {
          remarks: {
            text,
            addedBy: req.user._id,
            addedAt: new Date(),
          },
        },
        $set: { updatedBy: req.user._id },
      },
      { new: true, runValidators: true },
    ).populate(PROSPECT_POPULATE);

    if (!prospect) {
      return res
        .status(404)
        .json({ success: false, message: "Prospect not found" });
    }

    // Notify all clients of the new remark
    const io = req.app.get("io");
    if (io) {
      io.emit("prospect:remark", {
        message: `${req.user.name} added a remark on prospect for ${prospect.contact?.name}`,
        addedBy: {
          _id: req.user._id,
          name: req.user.name,
          devID: req.user.devID,
        },
        prospectId: prospect._id,
        remark: prospect.remarks[prospect.remarks.length - 1],
      });
    }

    res.status(201).json({
      success: true,
      message: "Remark added successfully",
      data: prospect,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a remark from a prospect
// @route   DELETE /api/prospects/:prospectId/remarks/:remarkId
// @access  Private
const deleteRemark = async (req, res, next) => {
  try {
    const prospect = await Prospect.findById(req.params.prospectId);
    if (!prospect) {
      return res
        .status(404)
        .json({ success: false, message: "Prospect not found" });
    }

    const remark = prospect.remarks.id(req.params.remarkId);
    if (!remark) {
      return res
        .status(404)
        .json({ success: false, message: "Remark not found" });
    }

    // Only the author or admin can delete
    if (
      remark.addedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own remarks.",
      });
    }

    remark.deleteOne();
    prospect.updatedBy = req.user._id;
    await prospect.save();

    const populated = await prospect.populate(PROSPECT_POPULATE);

    res.status(200).json({
      success: true,
      message: "Remark deleted",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get prospects created by the currently logged-in user
// @route   GET /api/prospects/my
// @access  Private
const getMyProspects = async (req, res, next) => {
  try {
    const prospects = await Prospect.find({
      createdBy: req.user._id,
      isActive: true,
    })
      .populate(PROSPECT_POPULATE)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: prospects.length,
      data: prospects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get prospects assigned to the currently logged-in user
// @route   GET /api/prospects/assigned-to-me
// @access  Private
const getAssignedToMe = async (req, res, next) => {
  try {
    const prospects = await Prospect.find({
      assignedTo: req.user._id,
      isActive: true,
    })
      .populate(PROSPECT_POPULATE)
      .sort({ followUpDate: 1 });

    res.status(200).json({
      success: true,
      count: prospects.length,
      data: prospects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pipeline summary (counts by status)
// @route   GET /api/prospects/summary
// @access  Private
const getPipelineSummary = async (req, res, next) => {
  try {
    const summary = await Prospect.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$estimatedValue" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalActive = await Prospect.countDocuments({ isActive: true });
    const totalValue = await Prospect.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: "$estimatedValue" } } },
    ]);

    res.status(200).json({
      success: true,
      totalProspects: totalActive,
      totalPipelineValue: totalValue[0]?.total || 0,
      byStatus: summary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProspects,
  getProspectById,
  updateProspect,
  addRemark,
  deleteRemark,
  getMyProspects,
  getAssignedToMe,
  getPipelineSummary,
};
