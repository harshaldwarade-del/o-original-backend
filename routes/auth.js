const express = require("express");
const router = express.Router();

const {
  login,
  getMe,
  createUser,
  getAllUsers,
  toggleUserStatus,
} = require("../controllers/authController");

const { protect, restrictTo } = require("../middleware/auth");
const {
  loginValidator,
  createUserValidator,
} = require("../middleware/validators");

// Public
router.post("/login", loginValidator, login);

// Private — any authenticated user
router.get("/me", protect, getMe);

// Private — Admin only
router.post(
  "/users",
  protect,
  restrictTo("admin"),
  createUserValidator,
  createUser,
);
router.get("/users", protect, restrictTo("admin"), getAllUsers);
router.patch(
  "/users/:userId/toggle-status",
  protect,
  restrictTo("admin"),
  toggleUserStatus,
);

module.exports = router;
