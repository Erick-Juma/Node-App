// server.js
import dotenv from "dotenv";
import express from "express";
import path from "path";
import cors from "cors";
import session from "express-session";
import { fileURLToPath } from "url";
import { sessionStore } from './config/db.js';
import { config } from './config/environment.js';

//import routes
import geminiRoutes from "./routes/gemini_routes/gemini.js";
import erevukaRoutes from "./routes/erevuka_routes/erevuka.js";
import akiRoutes from "./routes/aki_routes/aki.js";
import messageRoutes from "./routes/message.js";
import userRoutes from './routes/chatRoutes.js';
import erevukaAssistantRoutes from './routes/erevuka_routes/erevukaAssistant.js';


// Fix __dirname and __filename for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// === CORS setup ===

const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
// === Middleware ===
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", 1);

//check environment 
const isDev = process.env.NODE_ENV === 'development';

const cookieOptions = {
  secure: !isDev, // true in production & testing, false in development
  sameSite: !isDev ? 'none' : 'lax', // none for prod/testing, lax for dev
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// === Session ===
app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-session-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: cookieOptions,
  })
);

// === Route usage ===
app.use("/api", geminiRoutes);
app.use("/api", erevukaRoutes);
app.use("/api", akiRoutes);
app.use("/api", messageRoutes);
app.use("/api", userRoutes);
app.use("/api", erevukaAssistantRoutes);

// === Root route ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === Global error handler ===
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// === Start server ===
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
