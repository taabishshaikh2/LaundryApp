import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Garment from "./models/Garment.js";
import Service from "./models/Service.js";
import LaundryPartner from "./models/LaundryPartner.js";
import User from "./models/User.js";

const garments = [
  // MEN
  { category: "MEN", name: "Shirt", icon: "👔", washingPrice: 25, dryCleaningPrice: 45, ironingRegularPrice: 15, ironingExpressPrice: 30 },
  { category: "MEN", name: "T-Shirt", icon: "👕", washingPrice: 20, dryCleaningPrice: 36, ironingRegularPrice: 12, ironingExpressPrice: 24 },
  { category: "MEN", name: "Trousers", icon: "👖", washingPrice: 30, dryCleaningPrice: 54, ironingRegularPrice: 18, ironingExpressPrice: 36 },
  { category: "MEN", name: "Jeans", icon: "👖", washingPrice: 35, dryCleaningPrice: 63, ironingRegularPrice: 21, ironingExpressPrice: 42 },
  { category: "MEN", name: "Kurta-Pajama Set", icon: "🥻", washingPrice: 50, dryCleaningPrice: 90, ironingRegularPrice: 30, ironingExpressPrice: 60 },
  // WOMEN
  { category: "WOMEN", name: "Top / Blouse", icon: "👚", washingPrice: 25, dryCleaningPrice: 45, ironingRegularPrice: 15, ironingExpressPrice: 30 },
  { category: "WOMEN", name: "Kurti", icon: "🥻", washingPrice: 30, dryCleaningPrice: 54, ironingRegularPrice: 18, ironingExpressPrice: 36 },
  { category: "WOMEN", name: "Saree", icon: "🥻", washingPrice: 60, dryCleaningPrice: 108, ironingRegularPrice: 36, ironingExpressPrice: 72 },
  { category: "WOMEN", name: "Salwar Suit Set", icon: "🥻", washingPrice: 55, dryCleaningPrice: 99, ironingRegularPrice: 33, ironingExpressPrice: 66 },
  // KIDS
  { category: "KIDS", name: "Kids Shirt/T-Shirt", icon: "👕", washingPrice: 15, dryCleaningPrice: 27, ironingRegularPrice: 9, ironingExpressPrice: 18 },
  { category: "KIDS", name: "School Uniform Set", icon: "🎒", washingPrice: 35, dryCleaningPrice: 63, ironingRegularPrice: 21, ironingExpressPrice: 42 },
  // HOUSEHOLD
  { category: "HOUSEHOLD", name: "Bedsheet (Single)", icon: "🛏️", washingPrice: 40, dryCleaningPrice: 72, ironingRegularPrice: 24, ironingExpressPrice: 48 },
  { category: "HOUSEHOLD", name: "Bedsheet (Double)", icon: "🛏️", washingPrice: 60, dryCleaningPrice: 108, ironingRegularPrice: 36, ironingExpressPrice: 72 },
  { category: "HOUSEHOLD", name: "Bath Towel", icon: "🛁", washingPrice: 20, dryCleaningPrice: 36, ironingRegularPrice: 12, ironingExpressPrice: 24 },
  { category: "HOUSEHOLD", name: "Curtain", icon: "🪟", washingPrice: 45, dryCleaningPrice: 81, ironingRegularPrice: 27, ironingExpressPrice: 54 },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected. Seeding...");

  await Garment.deleteMany({});
  await Garment.insertMany(garments);
  console.log(`Inserted ${garments.length} garments.`);

  const services = [
    { name: "Services", code: "WASHING", icon: "🧺", description: "Wash & fold, everyday laundry.", hasExpressOption: false },
    { name: "Ironing", code: "IRONING", icon: "👔", description: "Pressing only, no wash.", hasExpressOption: true },
    { name: "Dry Cleaning", code: "DRY_CLEANING", icon: "🧥", description: "For delicate and formal fabrics.", hasExpressOption: false },
  ];
  await Service.deleteMany({});
  await Service.insertMany(services);
  console.log(`Inserted ${services.length} services (Washing, Ironing, Dry Cleaning).`);

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

  const partnerEmail = "partner1@dhobighat.com";
  const existingPartnerUser = await User.findOne({ email: partnerEmail });
  if (!existingPartnerUser) {
    const passwordHash = await bcrypt.hash("partner123", 10);
    const partnerUser = await User.create({
      name: "Suresh (Partner contact)",
      email: partnerEmail,
      phone: "9877700000",
      passwordHash,
      role: "LAUNDRY_PARTNER",
      onboarding: { completed: true },
    });
    await LaundryPartner.create({
      userId: partnerUser._id,
      businessName: "Sunshine Laundry Works",
      phone: "9877700000",
      address: "Andheri East, Mumbai",
      servicesOffered: ["WASHING", "IRONING", "DRY_CLEANING"],
    });
    console.log(`Created sample laundry partner login: ${partnerEmail} / partner123`);
  } else {
    console.log("Sample laundry partner already exists, skipping.");
  }

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});