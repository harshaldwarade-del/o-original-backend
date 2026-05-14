const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const prospectSchema = new mongoose.Schema(
  {
    // ── Linked Contact ────────────────────────────────────────────────────────
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'A contact reference is required'],
      unique: true, // one prospect record per contact
    },

    // ── Pipeline Stage ────────────────────────────────────────────────────────
    stage: {
      type: String,
      enum: [
        'new',         // just added as prospect
        'contacted',   // first outreach made
        'qualified',   // confirmed interest / fit
        'proposal',    // proposal/quote sent
        'negotiation', // actively negotiating
        'closed_won',  // deal closed successfully
        'closed_lost', // deal lost
        'on_hold',     // paused temporarily
      ],
      default: 'new',
    },

    // ── Priority & Value ──────────────────────────────────────────────────────
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    estimatedValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      // probability (%) of closing this prospect
    },

    // ── Timeline ──────────────────────────────────────────────────────────────
    expectedCloseDate: {
      type: Date,
    },
    followUpDate: {
      type: Date,
    },
    convertedAt: {
      // when contact was marked as prospect
      type: Date,
      default: Date.now,
    },

    // ── Assignment ────────────────────────────────────────────────────────────
    markedBy: {
      // who flagged this contact as a prospect
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      // salesperson responsible
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ── Qualification ─────────────────────────────────────────────────────────
    productsInterested: [{ type: String, trim: true }],
    requirements: {
      type: String,
      trim: true,
    },
    budget: {
      type: String,
      trim: true,
    },
    decisionMaker: {
      type: String,
      trim: true, // name of the person making the final call
    },
    competitorInfo: {
      type: String,
      trim: true,
    },

    // ── Activity Log ──────────────────────────────────────────────────────────
    // auto-populated when stages/notes change; full audit trail
    activityLog: [activityLogSchema],

    // ── Notes ────────────────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
prospectSchema.index({ stage: 1 });
prospectSchema.index({ priority: 1 });
prospectSchema.index({ assignedTo: 1 });
prospectSchema.index({ markedBy: 1 });
prospectSchema.index({ expectedCloseDate: 1 });

module.exports = mongoose.model('Prospect', prospectSchema);
