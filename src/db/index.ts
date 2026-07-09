import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envPath = process.env.NEXT_ENV_PATH || (fs.existsSync(path.resolve(process.cwd(), ".env.local")) 
  ? path.resolve(process.cwd(), ".env.local")
  : path.join(__dirname, "../../../.env.local"));

dotenv.config({ path: envPath, override: true });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
