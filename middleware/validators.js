const { body, param, validationResult } = require("express-validator");

// ── Helper: run validation result check ───────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Auth Validators ────────────────────────────────────────────────────────────
const loginValidator = [
  body("devID").notEmpty().withMessage("devID (loginId) is required").trim(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

// ── User Validators ────────────────────────────────────────────────────────────
const createUserValidator = [
  body("devID").notEmpty().withMessage("devID is required").trim(),
  body("name").notEmpty().withMessage("Name is required").trim(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["admin", "user"])
    .withMessage("Role must be 'admin' or 'user'"),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Must be a valid email address"),
  validate,
];

// ── Contact Validators ─────────────────────────────────────────────────────────
const CONTACT_CATEGORIES = [
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
];

const createContactValidator = [
  body("name").notEmpty().withMessage("Contact name is required").trim(),
  body("phoneNumber").notEmpty().withMessage("Phone number is required").trim(),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Must be a valid email address"),
  body("website")
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage("Must be a valid URL"),
  body("category")
    .optional()
    .isIn(CONTACT_CATEGORIES)
    .withMessage(`Category must be one of: ${CONTACT_CATEGORIES.join(", ")}`),
  body("address")
    .optional()
    .isObject()
    .withMessage("Address must be an object"),
  body("address.pincode")
    .optional({ checkFalsy: true })
    .isPostalCode("IN")
    .withMessage("Invalid Indian pincode"),
  validate,
];

const updateContactValidator = [
  body("name").optional().notEmpty().withMessage("Name cannot be empty").trim(),
  body("phoneNumber")
    .optional()
    .notEmpty()
    .withMessage("Phone number cannot be empty")
    .trim(),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Must be a valid email address"),
  body("website")
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage("Must be a valid URL"),
  body("category")
    .optional()
    .isIn(CONTACT_CATEGORIES)
    .withMessage(`Category must be one of: ${CONTACT_CATEGORIES.join(", ")}`),
  validate,
];

// ── Prospect Validators ────────────────────────────────────────────────────────
const PROSPECT_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
];
const PROSPECT_SOURCES = [
  "referral",
  "cold_call",
  "website",
  "social_media",
  "exhibition",
  "walk_in",
  "other",
];

const markProspectValidator = [
  body("status")
    .optional()
    .isIn(PROSPECT_STATUSES)
    .withMessage(`Status must be one of: ${PROSPECT_STATUSES.join(", ")}`),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
  body("estimatedValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Estimated value must be a non-negative number"),
  body("source")
    .optional()
    .isIn(PROSPECT_SOURCES)
    .withMessage(`Source must be one of: ${PROSPECT_SOURCES.join(", ")}`),
  body("followUpDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Follow-up date must be a valid ISO 8601 date"),
  body("assignedTo")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("assignedTo must be a valid user ID"),
  validate,
];

const updateProspectValidator = [
  body("status")
    .optional()
    .isIn(PROSPECT_STATUSES)
    .withMessage(`Status must be one of: ${PROSPECT_STATUSES.join(", ")}`),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
  body("estimatedValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Estimated value must be a non-negative number"),
  body("source")
    .optional()
    .isIn(PROSPECT_SOURCES)
    .withMessage(`Source must be one of: ${PROSPECT_SOURCES.join(", ")}`),
  body("followUpDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Follow-up date must be a valid ISO 8601 date"),
  body("assignedTo")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("assignedTo must be a valid user ID"),
  validate,
];

const addRemarkValidator = [
  body("text").notEmpty().withMessage("Remark text is required").trim(),
  validate,
];

module.exports = {
  loginValidator,
  createUserValidator,
  createContactValidator,
  updateContactValidator,
  markProspectValidator,
  updateProspectValidator,
  addRemarkValidator,
};
