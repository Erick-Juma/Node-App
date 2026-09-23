import pkg from "pg";
import fs from "fs";
import dotenv from "dotenv";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

dotenv.config();

const { Pool } = pkg;
const isProduction = process.env.NODE_ENV === "production";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { ca: fs.readFileSync("./certs/ca.pem").toString(), rejectUnauthorized: true }
    : false,
  max: 8,
});

db.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
  process.exit(1);
});

const PgSession = connectPgSimple(session);

export const sessionStore = new PgSession({
  pool: db,
  tableName: "session",
  createTableIfMissing: true,
});

console.log(`Using PostgreSQL (${process.env.NODE_ENV || "development"})`);