import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import garmentRoutes from "./routes/garments.js";
import serviceRoutes from "./routes/services.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import riderRoutes from "./routes/rider.js";
import partnerRoutes from "./routes/partner.js";
import adminSettingsRouter from "./routes/adminSettings.js";
import slotsRouter from "./routes/slots.js";
import slotsPublicRouter from "./routes/slotsPublic.js";
import publicSettingsRouter from "./routes/publicSettings.js";
import issueRoutes from "./routes/issues.js";


const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
// Handover photos are compressed by the client and kept deliberately small.
app.use(express.json({ limit: "3mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/garments", garmentRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rider", riderRoutes);
app.use("/api/partner", partnerRoutes);
app.use(["/api/admin/settings", "/admin/settings"], adminSettingsRouter);
app.use(["/api/admin/slots", "/admin/slots"], slotsRouter);
app.use("/api/slots", slotsPublicRouter);
app.use("/api/config", publicSettingsRouter);
app.use("/api/issues", issueRoutes);
// basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
