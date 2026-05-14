const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false },
);

const ContactSchema = new mongoose.Schema(
  {
    // ── Core Info ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Contact Details ────────────────────────────────────────
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Address ────────────────────────────────────────────────
    address: {
      type: AddressSchema,
      default: () => ({}),
    },

    // ── Classification ─────────────────────────────────────────
    category: {
      type: String,
      enum: [
        "education",
        "medical",
        "manufacturer",
        "retail",
        "technology",
        "finance",
        "real_estate",
        "hospitality",
        "logistics",
        "government",
        "ngo",
        "other",
      ],
      default: "other",
    },
    tags: {
      type: [String],
      default: [],
    },

    // ── Notes ──────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Prospect Linkage ───────────────────────────────────────
    isProspect: {
      type: Boolean,
      default: false,
    },
    prospect: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prospect",
      default: null,
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

// Full-text search index on name, company, email, phoneNumber
ContactSchema.index(
  { name: "text", company: "text", email: "text", phoneNumber: "text" },
  { name: "contact_search_index" },
);

module.exports = mongoose.model("Contact", ContactSchema);
