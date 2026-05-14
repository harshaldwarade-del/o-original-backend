const express = require("express");
const router = express.Router();
const {
  getProspects,
  getProspect,
  updateProspect,
  addNote,
  getDashboard,
} = require("../controllers/prospectController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/dashboard", getDashboard);

router.route("/")
  .get(getProspects);

router.route("/:id")
  .get(getProspect)
  .put(updateProspect);

router.post("/:id/add-note", addNote);

module.exports = router;
