import "dotenv/config";
import { Sentry, sentryEnabled } from "./instrument.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import helmet from "helmet";

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
import notificationRoutes from "./routes/notifications.js";
import growthRoutes from "./routes/growth.js";
import operationsRoutes from "./routes/operations.js";
import crypto from "crypto";
import { databaseInfrastructureState, inspectDatabaseInfrastructure } from "./services/databaseReadiness.js";


const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use((req, res, next) => { req.requestId = crypto.randomUUID(); res.set("X-Request-Id", req.requestId); next(); });

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
// Handover photos are compressed by the client and kept deliberately small.
app.use(express.json({ limit: "3mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() }));

app.get("/api/ready", async (req, res) => {
  const startedAt = Date.now();
  let database = "unavailable";
  let databaseError = "";
  if (mongoose.connection.readyState === 1) {
    let timer;
    try {
      await Promise.race([
        mongoose.connection.db.command({ ping: 1 }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Database ping timed out")), 2000); }),
      ]);
      database = "connected";
    } catch (error) {
      databaseError = error.message;
    } finally {
      clearTimeout(timer);
    }
  }
  const infrastructure = databaseInfrastructureState();
  const ready = database === "connected" && infrastructure.ready;
  res.status(ready ? 200 : 503).json({
    ok: ready,
    database,
    databaseError: databaseError || undefined,
    infrastructure,
    responseTimeMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
});

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
app.use("/api/notifications", notificationRoutes);
app.use("/api/growth", growthRoutes);
app.use("/api/operations", operationsRoutes);
if (sentryEnabled) Sentry.setupExpressErrorHandler(app);
app.use((err, req, res, next) => {
  console.error(JSON.stringify({ level: "error", requestId: req.requestId, method: req.method, path: req.originalUrl, message: err.message, stack: process.env.NODE_ENV === "production" ? undefined : err.stack }));
  res.status(500).json({ error: "Server error", requestId: req.requestId });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => console.log(`API listening on http://0.0.0.0:${PORT}`));

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: process.env.NODE_ENV !== "production",
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected");
    inspectDatabaseInfrastructure()
      .then((infrastructure) => console.log(JSON.stringify({ level: infrastructure.ready ? "info" : "warn", event: "database_infrastructure_check", ...infrastructure })))
      .catch((error) => {
        if (sentryEnabled) Sentry.captureException(error);
        console.error(JSON.stringify({ level: "error", event: "database_infrastructure_check_failed", message: error.message }));
      });
  } catch (err) {
    if (sentryEnabled) Sentry.captureException(err);
    console.error("MongoDB connection failed; retrying in 10 seconds:", err.message);
    setTimeout(connectDatabase, 10000);
  }
}

connectDatabase();
