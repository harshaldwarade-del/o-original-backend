/**
 * Seed Script
 * Run: node seed.js
 * Creates the first admin user so the portal can be accessed.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Contact = require("./models/Contact");
const Prospect = require("./models/Prospect");

const seed = async () => {
  await connectDB();

  try {
    // ── Clean existing seed data ─────────────────────────────────────────────
    await User.deleteMany({});
    await Contact.deleteMany({});
    await Prospect.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // ── Create Admin User ────────────────────────────────────────────────────
    const admin = await User.create({
      devID: "DEV001",
      password: "admin@123",
      name: "Super Admin",
      email: "admin@portal.com",
      role: "admin",
    });
    console.log(`✅ Admin created  → devID: DEV001 | password: admin@123`);

    // ── Create a regular user ────────────────────────────────────────────────
    const user1 = await User.create({
      devID: "DEV002",
      password: "user@123",
      name: "Rajesh Kumar",
      email: "rajesh@portal.com",
      role: "user",
    });
    console.log(`✅ User created   → devID: DEV002 | password: user@123`);

    // ── Create sample contacts ───────────────────────────────────────────────
    const contact1 = await Contact.create({
      name: "Dr. Priya Sharma",
      company: "Apollo Hospitals",
      designation: "Chief Medical Officer",
      phoneNumber: "9876543210",
      email: "priya.sharma@apollo.com",
      website: "https://apollohospitals.com",
      address: {
        street: "Jubilee Hills",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500033",
        country: "India",
      },
      category: "medical",
      tags: ["hospital", "senior"],
      notes: "Decision maker for medical equipment procurement",
      createdBy: admin._id,
    });

    const contact2 = await Contact.create({
      name: "Vikram Mehta",
      company: "Sunrise Manufacturing",
      designation: "Purchase Manager",
      phoneNumber: "9123456780",
      email: "vikram@sunrise-mfg.com",
      address: {
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        country: "India",
      },
      category: "manufacturer",
      tags: ["b2b", "bulk"],
      createdBy: user1._id,
    });

    console.log("✅ Sample contacts created");

    // ── Mark contact1 as a prospect ──────────────────────────────────────────
    const prospect = await Prospect.create({
      contact: contact1._id,
      status: "contacted",
      priority: "high",
      estimatedValue: 500000,
      currency: "INR",
      source: "referral",
      assignedTo: user1._id,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      notes: "Interested in diagnostic equipment upgrade",
      createdBy: admin._id,
      remarks: [
        {
          text: "Initial call done. Very interested.",
          addedBy: admin._id,
          addedAt: new Date(),
        },
      ],
    });

    contact1.isProspect = true;
    contact1.prospect = prospect._id;
    await contact1.save();

    console.log("✅ Sample prospect created and linked to contact");

    console.log("\n🎉 Seed complete! You can now log in with:");
    console.log("   devID: DEV001  |  password: admin@123  (Admin)");
    console.log("   devID: DEV002  |  password: user@123   (User)\n");
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
  } finally {
    mongoose.disconnect();
  }
};

seed();
