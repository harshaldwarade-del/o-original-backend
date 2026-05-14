/**
 * Run: node src/utils/seed.js
 */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const mongoose = require("mongoose");

const User = require("../models/User");
const Contact = require("../models/Contact");
const Prospect = require("../models/Prospect");
const Notification = require("../models/Notification");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Connected to MongoDB");

    // ─────────────────────────────────────────────────────────────
    // CLEAN DATABASE
    // ─────────────────────────────────────────────────────────────

    await Notification.deleteMany({});
    await Prospect.deleteMany({});
    await Contact.deleteMany({});
    await User.deleteMany({});

    console.log("🧹 Old data removed");

    // ─────────────────────────────────────────────────────────────
    // USERS
    // ─────────────────────────────────────────────────────────────

    const admin = await User.create({
      devID: "ADM001",
      name: "Admin User",
      email: "admin@company.com",
      password: "Admin@1234",
      role: "admin",
      department: "Management",
    });

    const manager = await User.create({
      devID: "MGR001",
      name: "Rahul Sharma",
      email: "rahul@company.com",
      password: "Pass@1234",
      role: "manager",
      department: "Sales",
    });

    const user1 = await User.create({
      devID: "DEV001",
      name: "Priya Mehta",
      email: "priya@company.com",
      password: "Pass@1234",
      role: "user",
      department: "Business Development",
    });

    const user2 = await User.create({
      devID: "DEV002",
      name: "Amit Joshi",
      email: "amit@company.com",
      password: "Pass@1234",
      role: "user",
      department: "Field Sales",
    });

    // ─────────────────────────────────────────────────────────────
    // CONTACTS
    // ─────────────────────────────────────────────────────────────

    const contacts = await Contact.create([
      {
        firstName: "Amit",
        lastName: "Desai",
        company: "Desai Multispecialty Hospital",
        jobTitle: "Director",

        email: "amit.desai@hospital.com",
        phoneNumber: "+91 9876543210",
        alternatePhone: "+91 9988776655",

        website: "https://desaihospital.com",

        address: {
          street: "MG Road",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          zipCode: "400001",
        },

        socialLinks: {
          linkedin: "https://linkedin.com/in/amitdesai",
        },

        category: "medical",

        tags: ["VIP", "Key Account"],

        notes: "Met during Healthcare Expo 2025",

        rating: 5,

        source: "event",

        createdBy: manager._id,
        assignedTo: user1._id,
      },

      {
        firstName: "Sneha",
        lastName: "Kulkarni",
        company: "Kulkarni Edu-Tech",
        jobTitle: "CEO",

        email: "sneha@kulkarniedu.com",
        phoneNumber: "+91 9812345678",

        website: "https://kulkarniedu.com",

        address: {
          city: "Pune",
          state: "Maharashtra",
          country: "India",
        },

        socialLinks: {
          linkedin: "https://linkedin.com/in/snehakulkarni",
          twitter: "https://twitter.com/snehakulkarni",
        },

        category: "education",

        tags: ["Startup", "Decision Maker"],

        notes: "Interested in enterprise CRM package",

        rating: 4,

        source: "website",

        createdBy: user1._id,
        assignedTo: user2._id,
      },

      {
        firstName: "Raj",
        lastName: "Verma",
        company: "Verma Auto Parts",
        jobTitle: "Managing Director",

        email: "raj@vermaauto.com",
        phoneNumber: "+91 9765432100",

        address: {
          city: "Nashik",
          state: "Maharashtra",
          country: "India",
        },

        category: "manufacturer",

        tags: ["Manufacturing", "High Value"],

        notes: "Looking for long-term partnership",

        rating: 5,

        source: "referral",

        createdBy: admin._id,
        assignedTo: manager._id,
      },

      {
        firstName: "Neha",
        lastName: "Patil",
        company: "Patil Logistics",
        jobTitle: "Operations Head",

        email: "neha@patillogistics.com",
        phoneNumber: "+91 9871112233",

        category: "logistics",

        tags: ["Logistics"],

        rating: 3,

        source: "cold_call",

        createdBy: user2._id,
        assignedTo: manager._id,
      },
    ]);

    // ─────────────────────────────────────────────────────────────
    // PROSPECTS
    // ─────────────────────────────────────────────────────────────

    const prospect1 = await Prospect.create({
      contact: contacts[0]._id,

      stage: "proposal",
      priority: "high",

      estimatedValue: 750000,
      currency: "INR",

      probability: 70,

      expectedCloseDate: new Date("2026-07-20"),
      followUpDate: new Date("2026-05-20"),

      markedBy: manager._id,
      assignedTo: user1._id,

      productsInterested: ["CRM Enterprise Suite", "Analytics Dashboard"],

      requirements: "Needs centralized lead management with reporting features",

      budget: "7-10 Lakhs",

      decisionMaker: "Dr. Amit Desai",

      competitorInfo: "Currently evaluating Zoho CRM",

      notes: "Strong buying intent",

      activityLog: [
        {
          action: "Prospect Created",
          performedBy: manager._id,
          note: "Initial qualification completed",
        },
        {
          action: "Proposal Shared",
          performedBy: user1._id,
          note: "Pricing proposal emailed",
        },
      ],
    });

    const prospect2 = await Prospect.create({
      contact: contacts[1]._id,

      stage: "qualified",
      priority: "medium",

      estimatedValue: 300000,
      currency: "INR",

      probability: 50,

      expectedCloseDate: new Date("2026-08-10"),

      markedBy: user1._id,
      assignedTo: user2._id,

      productsInterested: ["CRM Starter Package"],

      requirements: "Need student inquiry tracking system",

      budget: "2-4 Lakhs",

      decisionMaker: "Sneha Kulkarni",

      notes: "Requested live demo",

      activityLog: [
        {
          action: "Qualified Lead",
          performedBy: user1._id,
          note: "Budget and authority confirmed",
        },
      ],
    });

    // ─────────────────────────────────────────────────────────────
    // UPDATE CONTACTS AS PROSPECTS
    // ─────────────────────────────────────────────────────────────

    await Contact.findByIdAndUpdate(contacts[0]._id, {
      isProspect: true,
      prospectId: prospect1._id,
    });

    await Contact.findByIdAndUpdate(contacts[1]._id, {
      isProspect: true,
      prospectId: prospect2._id,
    });

    // ─────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────

    await Notification.create([
      {
        type: "prospect_added",

        title: "New Prospect Added",

        message: "Amit Desai has been added as a high priority prospect.",

        prospect: prospect1._id,
        contact: contacts[0]._id,

        triggeredBy: manager._id,
        triggeredByName: manager.name,

        targetUser: user1._id,

        meta: {
          stage: "proposal",
          priority: "high",
        },
      },

      {
        type: "prospect_assigned",

        title: "Prospect Assigned",

        message: "Sneha Kulkarni prospect has been assigned to Amit Joshi.",

        prospect: prospect2._id,
        contact: contacts[1]._id,

        triggeredBy: user1._id,
        triggeredByName: user1.name,

        targetUser: user2._id,
      },

      {
        type: "follow_up_due",

        title: "Follow-up Reminder",

        message: "Follow-up scheduled with Amit Desai on May 20, 2026.",

        prospect: prospect1._id,
        contact: contacts[0]._id,

        triggeredBy: admin._id,
        triggeredByName: admin.name,
      },
    ]);

    // ─────────────────────────────────────────────────────────────

    console.log("\n🎉 DATABASE SEEDED SUCCESSFULLY\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👤 LOGIN USERS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("Admin");
    console.log("devID: ADM001");
    console.log("password: Admin@1234\n");

    console.log("Manager");
    console.log("devID: MGR001");
    console.log("password: Pass@1234\n");

    console.log("User");
    console.log("devID: DEV001");
    console.log("password: Pass@1234\n");

    console.log("User");
    console.log("devID: DEV002");
    console.log("password: Pass@1234\n");

    await mongoose.disconnect();

    console.log("✅ MongoDB disconnected");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed");
    console.error(err);

    process.exit(1);
  }
};

seed();
