const express = require("express");
const router = express.Router();

const {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
  markAsProspect,
  unmarkAsProspect,
} = require("../controllers/contactController");

const { protect } = require("../middleware/auth");
const {
  createContactValidator,
  updateContactValidator,
  markProspectValidator,
} = require("../middleware/validators");

// All contact routes require authentication
router.use(protect);

// ── Contact CRUD ───────────────────────────────────────────────────────────────
router
  .route("/")
  .get(getAllContacts)
  .post(createContactValidator, createContact);

router
  .route("/:contactId")
  .get(getContactById)
  .put(updateContactValidator, updateContact)
  .delete(deleteContact);

// ── Prospect Marking ───────────────────────────────────────────────────────────
router
  .route("/:contactId/mark-prospect")
  .post(markProspectValidator, markAsProspect) // mark as prospect
  .delete(unmarkAsProspect); // unmark prospect

module.exports = router;
