const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// @desc    Login user with devID and password
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { devID, password } = req.body;

    // Find user and explicitly select password (it's excluded by default)
    const user = await User.findOne({ devID: devID.toUpperCase() }).select(
      "+password",
    );

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid devID or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact an admin.",
      });
    }

    // Record last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        devID: user.devID,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new portal user (admin only)
// @route   POST /api/auth/users
// @access  Private / Admin
const createUser = async (req, res, next) => {
  try {
    const { devID, name, password, email, role } = req.body;

    const existingUser = await User.findOne({ devID: devID.toUpperCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A user with devID '${devID.toUpperCase()}' already exists.`,
      });
    }

    const newUser = await User.create({ devID, name, password, email, role });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        _id: newUser._id,
        devID: newUser.devID,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all portal users (admin only)
// @route   GET /api/auth/users
// @access  Private / Admin
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate / Deactivate a user (admin only)
// @route   PATCH /api/auth/users/:userId/toggle-status
// @access  Private / Admin
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { _id: user._id, devID: user.devID, isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe, createUser, getAllUsers, toggleUserStatus };
