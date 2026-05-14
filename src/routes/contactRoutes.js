const express = require("express");
const router = express.Router();
const {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  markAsProspect,
  unmarkProspect,
} = require("../controllers/contactController");
const { protect, restrictTo } = require("../middleware/auth");

// All contact routes require authentication
router.use(protect);

router.route("/").get(getContacts).post(createContact);

router
  .route("/:id")
  .get(getContact)
  .put(updateContact)
  .delete(authorise("admin"), deleteContact);

// Prospect actions on a contact
router.patch("/:id/mark-prospect", markAsProspect);
router.patch(
  "/:id/unmark-prospect",
  restrictTo("admin", "user"),
  unmarkProspect,
);

module.exports = router;
