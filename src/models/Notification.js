const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "prospect_added",
        "prospect_status_changed",
        "prospect_assigned",
        "prospect_won",
        "prospect_lost",
        "contact_added",
        "follow_up_due",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // References to related documents
    prospect: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prospect",
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
    },
    // Who triggered the notification
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    triggeredByName: {
      type: String,
      required: true,
    },
    // Which users have read it
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    // Targeted to specific user, or null = broadcast to everyone
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    meta: { type: mongoose.Schema.Types.Mixed }, // any extra payload
  },
  { timestamps: true }
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ targetUser: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
