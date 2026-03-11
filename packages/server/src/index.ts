import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { sessionMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import birdsRoutes from "./routes/birds.js";
import observationsRoutes from "./routes/observations.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/birds", birdsRoutes);
app.use("/api/observations", observationsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
