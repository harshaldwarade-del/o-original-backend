const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true },
  },
  { _id: false }
);

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    facebook: { type: String, trim: true },
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    // ── Core Identity ─────────────────────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },

    // ── Contact Info ──────────────────────────────────────────────────────────
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    address: addressSchema,
    socialLinks: socialLinksSchema,

    // ── Classification ────────────────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'education',
        'medical',
        'manufacturer',
        'retail',
        'technology',
        'finance',
        'real_estate',
        'legal',
        'hospitality',
        'logistics',
        'government',
        'non_profit',
        'other',
      ],
      default: 'other',
    },
    tags: [{ type: String, trim: true }],

    // ── Prospect Status ───────────────────────────────────────────────────────
    isProspect: {
      type: Boolean,
      default: false,
    },
    prospectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prospect',
      default: null,
    },

    // ── Notes & Misc ──────────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    source: {
      type: String,
      enum: ['referral', 'website', 'cold_call', 'event', 'social_media', 'other'],
      default: 'other',
    },

    // ── Ownership ─────────────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: full name
contactSchema.virtual('fullName').get(function () {
  return `${this.firstName}${this.lastName ? ' ' + this.lastName : ''}`;
});

// Indexes for fast lookups
contactSchema.index({ email: 1 });
contactSchema.index({ company: 1 });
contactSchema.index({ isProspect: 1 });
contactSchema.index({ createdBy: 1 });
contactSchema.index({ category: 1 });
contactSchema.index({ '$**': 'text' }); // full-text search

module.exports = mongoose.model('Contact', contactSchema);
