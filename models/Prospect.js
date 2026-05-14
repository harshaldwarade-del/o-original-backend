const mongoose = require("mongoose");

// Individual remark/activity entry on a prospect
const RemarkSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const ProspectSchema = new mongoose.Schema(
  {
    // ── Linked Contact ─────────────────────────────────────────
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: [true, "A prospect must be linked to a contact"],
      unique: true, // one prospect record per contact
    },

    // ── Pipeline Status ────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "qualified",
        "proposal_sent",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      default: "new",
    },

    // ── Priority ───────────────────────────────────────────────
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // ── Deal Info ──────────────────────────────────────────────
    estimatedValue: {
      type: Number,
      default: 0,
      min: [0, "Estimated value cannot be negative"],
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },

    // ── Lead Source ────────────────────────────────────────────
    source: {
      type: String,
      enum: [
        "referral",
        "cold_call",
        "website",
        "social_media",
        "exhibition",
        "walk_in",
        "other",
      ],
      default: "other",
    },

    // ── Assignment & Follow-up ─────────────────────────────────
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    followUpDate: {
      type: Date,
      default: null,
    },

    // ── Notes & Activity Log ───────────────────────────────────
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    remarks: {
      type: [RemarkSchema],
      default: [],
    },

    // ── Soft-delete / active state ─────────────────────────────
    // Set to false when contact is un-marked as prospect
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Audit ──────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Prospect", ProspectSchema);
