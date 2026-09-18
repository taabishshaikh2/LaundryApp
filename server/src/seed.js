import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Garment from "./models/Garment.js";
import Service from "./models/Service.js";
import LaundryPartner from "./models/LaundryPartner.js";
import User from "./models/User.js";

const garments = [
  // MEN
  { category: "MEN", name: "Shirt", icon: "👔", priceRegular: 25 },
  { category: "MEN", name: "T-Shirt", icon: "👕", priceRegular: 20 },
  { category: "MEN", name: "Trousers", icon: "👖", priceRegular: 30 },
  { category: "MEN", name: "Jeans", icon: "👖", priceRegular: 35 },
  { category: "MEN", name: "Kurta-Pajama Set", icon: "🥻", priceRegular: 50 },
  // WOMEN
  { category: "WOMEN", name: "Top / Blouse", icon: "👚", priceRegular: 25 },
  { category: "WOMEN", name: "Kurti", icon: "🥻", priceRegular: 30 },
  { category: "WOMEN", name: "Saree", icon: "🥻", priceRegular: 60 },
  { category: "WOMEN", name: "Salwar Suit Set", icon: "🥻", priceRegular: 55 },
  // KIDS
  { category: "KIDS", name: "Kids Shirt/T-Shirt", icon: "👕", priceRegular: 15 },
  { category: "KIDS", name: "School Uniform Set", icon: "🎒", priceRegular: 35 },
  // HOUSEHOLD
  { category: "HOUSEHOLD", name: "Bedsheet (Single)", icon: "🛏️", priceRegular: 40 },
  { category: "HOUSEHOLD", name: "Bedsheet (Double)", icon: "🛏️", priceRegular: 60 },
  { category: "HOUSEHOLD", name: "Bath Towel", icon: "🛁", priceRegular: 20 },
  { category: "HOUSEHOLD", name: "Curtain", icon: "🪟", priceRegular: 45 },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected. Seeding...");

  await Garment.deleteMany({});
  await Garment.insertMany(garments);
  console.log(`Inserted ${garments.length} garments.`);

  const services = [
    { name: "Washing", code: "WASHING", icon: "🧺", description: "Wash & fold, everyday laundry.", priceMultiplier: 1 },
    { name: "Ironing", code: "IRONING", icon: "👔", description: "Pressing only, no wash.", priceMultiplier: 0.6 },
    { name: "Dry Cleaning", code: "DRY_CLEANING", icon: "🧥", description: "For delicate and formal fabrics.", priceMultiplier: 1.8 },
  ];
  await Service.deleteMany({});
  await Service.insertMany(services);
  console.log(`Inserted ${services.length} services (Washing, Ironing, Dry Cleaning).`);

  const partnerCount = await LaundryPartner.countDocuments();
  if (partnerCount === 0) {
    await LaundryPartner.create({
      name: "Sunshine Laundry Works",
      phone: "9877700000",
      address: "Andheri East, Mumbai",
      servicesOffered: ["WASHING", "IRONING", "DRY_CLEANING"],
    });
    console.log("Inserted a sample laundry partner.");
  } else {
    console.log("Laundry partners already exist, skipping.");
  }

  const adminEmail = "admin@dhobighat.com";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await User.create({
      name: "Dhobi Ghat Admin",
      email: adminEmail,
      phone: "9999999999",
      passwordHash,
      role: "ADMIN",
      onboarding: { completed: true },
    });
    console.log(`Created default admin: ${adminEmail} / admin123`);
  } else {
    console.log("Admin already exists, skipping.");
  }

  const riderEmail = "rider1@dhobighat.com";
  const existingRider = await User.findOne({ email: riderEmail });
  if (!existingRider) {
    const passwordHash = await bcrypt.hash("rider123", 10);
    await User.create({
      name: "Rahul (Rider)",
      email: riderEmail,
      phone: "9888888888",
      passwordHash,
      role: "RIDER",
      onboarding: { completed: true },
    });
    console.log(`Created sample rider: ${riderEmail} / rider123`);
  } else {
    console.log("Sample rider already exists, skipping.");
  }

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
