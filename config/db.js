import pkg from "pg";
import fs from "fs";
import dotenv from "dotenv";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

dotenv.config();

const { Pool } = pkg;
const isProduction = process.env.NODE_ENV === "production";

export const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
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