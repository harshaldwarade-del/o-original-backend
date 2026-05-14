const express = require("express");
const router = express.Router();

const {
  getAllProspects,
  getProspectById,
  updateProspect,
  addRemark,
  deleteRemark,
  getMyProspects,
  getAssignedToMe,
  getPipelineSummary,
} = require("../controllers/prospectController");

const { protect } = require("../middleware/auth");
const {
  updateProspectValidator,
  addRemarkValidator,
} = require("../middleware/validators");

// All prospect routes require authentication
router.use(protect);

// ── Special routes (must come before /:prospectId) ────────────────────────────
router.get("/summary", getPipelineSummary);
router.get("/my", getMyProspects);
router.get("/assigned-to-me", getAssignedToMe);

// ── Standard CRUD ──────────────────────────────────────────────────────────────
router.route("/").get(getAllProspects);
// Prospects are only created via POST /api/contacts/:contactId/mark-prospect
// so there is intentionally no POST / here.

router
  .route("/:prospectId")
  .get(getProspectById)
  .put(updateProspectValidator, updateProspect);

// ── Remarks / Activity Log ─────────────────────────────────────────────────────
router.route("/:prospectId/remarks").post(addRemarkValidator, addRemark);

router.route("/:prospectId/remarks/:remarkId").delete(deleteRemark);

module.exports = router;
