const Contact = require("../models/Contact");
const Prospect = require("../models/Prospect");
const Notification = require("../models/Notification");
const socket = require("../socket/socketManager");

// ── GET /api/contacts ─────────────────────────────────────────────────────────
exports.getContacts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      isProspect,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};

    // Full-text search
    if (search) {
      query.$text = { $search: search };
    }

    if (category) query.category = category;

    if (isProspect !== undefined) {
      query.isProspect = isProspect === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .populate("prospect", "status priority estimatedValue assignedToName followUpDate")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Contact.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: contacts.length,
      data: contacts,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/contacts/:id ─────────────────────────────────────────────────────
exports.getContact = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate("createdBy", "name devID")
      .populate("updatedBy", "name devID")
      .populate({
        path: "prospect",
        populate: { path: "assignedTo", select: "name devID" },
      });

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/contacts ────────────────────────────────────────────────────────
exports.createContact = async (req, res, next) => {
  try {
    const contact = await Contact.create({
      ...req.body,
      createdBy: req.user._id,
      createdByName: req.user.name,
    });

    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/contacts/:id ─────────────────────────────────────────────────────
exports.updateContact = async (req, res, next) => {
  try {
    // Prevent directly toggling isProspect through this route
    delete req.body.isProspect;
    delete req.body.prospect;
    delete req.body.createdBy;
    delete req.body.createdByName;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id,
        updatedByName: req.user.name,
      },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/contacts/:id ──────────────────────────────────────────────────
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    // Cascade delete linked prospect if it exists
    if (contact.prospect) {
      await Prospect.findByIdAndDelete(contact.prospect);
    }

    await contact.deleteOne();

    res.json({ success: true, message: "Contact deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/contacts/:id/mark-prospect ────────────────────────────────────
//    Marks a contact as a prospect (or updates prospect details)
exports.markAsProspect = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

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
      interestedIn,
    } = req.body;

    let prospect;
    let isNewProspect = false;

    if (contact.isProspect && contact.prospect) {
      // ── Already a prospect → update ─────────────────────────────
      prospect = await Prospect.findById(contact.prospect);
      if (!prospect) {
        return res.status(404).json({ success: false, message: "Linked prospect record not found" });
      }

      const oldStatus = prospect.status;

      Object.assign(prospect, {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(estimatedValue !== undefined && { estimatedValue }),
        ...(currency && { currency }),
        ...(expectedCloseDate && { expectedCloseDate }),
        ...(followUpDate && { followUpDate }),
        ...(assignedTo && { assignedTo }),
        ...(assignedToName && { assignedToName }),
        ...(source && { source }),
        ...(remarks !== undefined && { remarks }),
        ...(interestedIn && { interestedIn }),
        updatedBy: req.user._id,
        updatedByName: req.user.name,
      });

      // Handle won/lost close date
      if (status === "won" || status === "lost") {
        prospect.wonLostDate = new Date();
      }

      // Log activity if status changed
      if (status && status !== oldStatus) {
        prospect.activities.push({
          action: "status_changed",
          description: `Status changed from '${oldStatus}' to '${status}'`,
          performedBy: req.user._id,
          performedByName: req.user.name,
          meta: { from: oldStatus, to: status },
        });

        // Broadcast status change notification
        const notification = await Notification.create({
          type: status === "won" ? "prospect_won" : status === "lost" ? "prospect_lost" : "prospect_status_changed",
          title: status === "won" ? "🎉 Prospect Won!" : `Prospect Status Updated`,
          message: `${req.user.name} updated ${contact.name}'s prospect status to '${status}'`,
          prospect: prospect._id,
          contact: contact._id,
          triggeredBy: req.user._id,
          triggeredByName: req.user.name,
        });

        socket.broadcastToAll("notification", {
          ...notification.toObject(),
          contactName: contact.name,
          company: contact.company,
        });
      }

      await prospect.save();
    } else {
      // ── New prospect ──────────────────────────────────────────────
      isNewProspect = true;

      prospect = await Prospect.create({
        contact: contact._id,
        status: status || "new",
        priority: priority || "medium",
        estimatedValue: estimatedValue || 0,
        currency: currency || "INR",
        expectedCloseDate,
        followUpDate,
        assignedTo,
        assignedToName,
        source: source || "other",
        remarks,
        interestedIn,
        markedProspectBy: req.user._id,
        markedProspectByName: req.user.name,
        activities: [
          {
            action: "created",
            description: `Marked as prospect by ${req.user.name}`,
            performedBy: req.user._id,
            performedByName: req.user.name,
          },
        ],
      });

      // Update contact flags
      contact.isProspect = true;
      contact.prospect = prospect._id;
      contact.updatedBy = req.user._id;
      contact.updatedByName = req.user.name;
      await contact.save();

      // ── Real-time broadcast to all portal users ───────────────────
      const notification = await Notification.create({
        type: "prospect_added",
        title: "New Prospect Added",
        message: `${req.user.name} marked ${contact.name}${contact.company ? ` (${contact.company})` : ""} as a prospect`,
        prospect: prospect._id,
        contact: contact._id,
        triggeredBy: req.user._id,
        triggeredByName: req.user.name,
      });

      socket.broadcastToAll("notification", {
        ...notification.toObject(),
        contactName: contact.name,
        company: contact.company,
        prospectStatus: prospect.status,
        priority: prospect.priority,
      });
    }

    // Populate and return full contact
    const updatedContact = await Contact.findById(contact._id).populate("prospect");

    res.json({
      success: true,
      message: isNewProspect ? "Contact successfully marked as prospect" : "Prospect updated",
      data: updatedContact,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/contacts/:id/unmark-prospect ───────────────────────────────────
exports.unmarkProspect = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    if (!contact.isProspect) {
      return res.status(400).json({ success: false, message: "Contact is not a prospect" });
    }

    if (contact.prospect) {
      await Prospect.findByIdAndDelete(contact.prospect);
    }

    contact.isProspect = false;
    contact.prospect = null;
    contact.updatedBy = req.user._id;
    contact.updatedByName = req.user.name;
    await contact.save();

    res.json({ success: true, message: "Contact unmarked as prospect", data: contact });
  } catch (err) {
    next(err);
  }
};
