const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  getMe,
  changePassword,
  register,
  getAllUsers,
} = require("../controllers/authController");
const { protect, authorise } = require("../middleware/auth");

router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePassword);

// Admin-only
router.post("/register", protect, authorise("admin"), register);
router.get("/users", protect, getAllUsers);

module.exports = router;
