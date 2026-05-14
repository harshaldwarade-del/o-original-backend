const Notification = require("../models/Notification");

// ── GET /api/notifications ────────────────────────────────────────────────────
//    Returns broadcast notifications + notifications targeted at the current user
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, unreadOnly } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const baseFilter = {
      $or: [{ targetUser: null }, { targetUser: req.user._id }],
    };

    if (unreadOnly === "true") {
      baseFilter["readBy.user"] = { $ne: req.user._id };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(baseFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("prospect", "status priority")
        .populate("contact", "name company"),
      Notification.countDocuments(baseFilter),
      Notification.countDocuments({
        ...baseFilter,
        "readBy.user": { $ne: req.user._id },
      }),
    ]);

    // Annotate each notification with whether the current user has read it
    const annotated = notifications.map((n) => {
      const obj = n.toObject();
      obj.isRead = n.readBy.some((r) => r.user.toString() === req.user._id.toString());
      return obj;
    });

    res.json({
      success: true,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: annotated,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    const alreadyRead = notification.readBy.some(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      notification.readBy.push({ user: req.user._id });
      await notification.save();
    }

    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/mark-all-read ───────────────────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [{ targetUser: null }, { targetUser: req.user._id }],
      "readBy.user": { $ne: req.user._id },
    });

    const bulkOps = notifications.map((n) => ({
      updateOne: {
        filter: { _id: n._id },
        update: { $push: { readBy: { user: req.user._id } } },
      },
    }));

    if (bulkOps.length) {
      await Notification.bulkWrite(bulkOps);
    }

    res.json({ success: true, message: `${bulkOps.length} notifications marked as read` });
  } catch (err) {
    next(err);
  }
};
