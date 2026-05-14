const Contact = require("../models/Contact");
const Prospect = require("../models/Prospect");

// ── Populate helper ────────────────────────────────────────────────────────────
const CONTACT_POPULATE = [
  { path: "createdBy", select: "devID name" },
  { path: "updatedBy", select: "devID name" },
  {
    path: "prospect",
    select:
      "status priority estimatedValue currency followUpDate assignedTo isActive",
  },
];

// @desc    Create a new contact
// @route   POST /api/contacts
// @access  Private
const createContact = async (req, res, next) => {
  try {
    const {
      name,
      company,
      designation,
      phoneNumber,
      alternatePhone,
      email,
      website,
      address,
      category,
      tags,
      notes,
    } = req.body;

    const contact = await Contact.create({
      name,
      company,
      designation,
      phoneNumber,
      alternatePhone,
      email,
      website,
      address,
      category,
      tags,
      notes,
      createdBy: req.user._id,
    });

    const populated = await contact.populate(CONTACT_POPULATE);

    res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contacts (with search, filter, pagination)
// @route   GET /api/contacts
// @access  Private
const getAllContacts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      isProspect,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = {};

    // Full-text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by prospect flag
    if (isProspect !== undefined) {
      filter.isProspect = isProspect === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .populate(CONTACT_POPULATE)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Contact.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single contact by ID
// @route   GET /api/contacts/:contactId
// @access  Private
const getContactById = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.contactId).populate(
      CONTACT_POPULATE,
    );

    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }

    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a contact
// @route   PUT /api/contacts/:contactId
// @access  Private
const updateContact = async (req, res, next) => {
  try {
    // Prevent direct manipulation of prospect-related fields via this route
    const {
      isProspect: _ip,
      prospect: _p,
      createdBy: _cb,
      ...updateFields
    } = req.body;

    updateFields.updatedBy = req.user._id;

    const contact = await Contact.findByIdAndUpdate(
      req.params.contactId,
      { $set: updateFields },
      { new: true, runValidators: true },
    ).populate(CONTACT_POPULATE);

    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a contact (also removes associated prospect)
// @route   DELETE /api/contacts/:contactId
// @access  Private
const deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.contactId);
    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }

    // Remove linked prospect if it exists
    if (contact.prospect) {
      await Prospect.findByIdAndDelete(contact.prospect);
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      message: "Contact and associated prospect deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a contact as a prospect  (creates Prospect doc)
// @route   POST /api/contacts/:contactId/mark-prospect
// @access  Private
const markAsProspect = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.contactId);
    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }

    if (contact.isProspect) {
      return res.status(409).json({
        success: false,
        message: "This contact is already marked as a prospect.",
      });
    }

    const {
      status,
      priority,
      estimatedValue,
      currency,
      source,
      assignedTo,
      followUpDate,
      notes,
    } = req.body;

    // Create Prospect record
    const prospect = await Prospect.create({
      contact: contact._id,
      status: status || "new",
      priority: priority || "medium",
      estimatedValue: estimatedValue || 0,
      currency: currency || "INR",
      source: source || "other",
      assignedTo: assignedTo || null,
      followUpDate: followUpDate || null,
      notes: notes || "",
      createdBy: req.user._id,
    });

    // Update Contact
    contact.isProspect = true;
    contact.prospect = prospect._id;
    contact.updatedBy = req.user._id;
    await contact.save();

    const populatedProspect = await Prospect.findById(prospect._id)
      .populate({
        path: "contact",
        select: "name company phoneNumber email category",
      })
      .populate({ path: "assignedTo", select: "devID name" })
      .populate({ path: "createdBy", select: "devID name" });

    // Emit real-time event to all connected clients
    const io = req.app.get("io");
    if (io) {
      io.emit("prospect:new", {
        message: `${contact.name} has been marked as a prospect by ${req.user.name}`,
        markedBy: {
          _id: req.user._id,
          name: req.user.name,
          devID: req.user.devID,
        },
        prospect: populatedProspect,
      });
    }

    res.status(201).json({
      success: true,
      message: `${contact.name} has been marked as a prospect`,
      data: populatedProspect,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unmark a contact as a prospect (deactivates Prospect doc)
// @route   DELETE /api/contacts/:contactId/mark-prospect
// @access  Private
const unmarkAsProspect = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.contactId);
    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    }

    if (!contact.isProspect) {
      return res.status(409).json({
        success: false,
        message: "This contact is not currently marked as a prospect.",
      });
    }

    // Deactivate prospect (soft delete)
    if (contact.prospect) {
      await Prospect.findByIdAndUpdate(contact.prospect, {
        isActive: false,
        updatedBy: req.user._id,
      });
    }

    // Update contact
    contact.isProspect = false;
    contact.prospect = null;
    contact.updatedBy = req.user._id;
    await contact.save();

    // Notify all connected clients
    const io = req.app.get("io");
    if (io) {
      io.emit("prospect:removed", {
        message: `${contact.name} has been removed from prospects by ${req.user.name}`,
        removedBy: {
          _id: req.user._id,
          name: req.user.name,
          devID: req.user.devID,
        },
        contactId: contact._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `${contact.name} has been removed from prospects`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
  markAsProspect,
  unmarkAsProspect,
};
