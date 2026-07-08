import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { transactionTypes } from "./schema";
import { eq, and } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function seed() {
  console.log("🌱 Seeding transaction types...");

  // Tipo NFCE (entrada)
  const existingNfce = await db
    .select()
    .from(transactionTypes)
    .where(and(eq(transactionTypes.name, "NFCE"), eq(transactionTypes.type, "in")))
    .limit(1);

  if (existingNfce.length === 0) {
    await db.insert(transactionTypes).values({ name: "NFCE", type: "in" });
    console.log("  ✅ Tipo 'NFCE' (entrada) criado");
  } else {
    console.log("  ⏭️  Tipo 'NFCE' (entrada) já existe");
  }

  // Tipo Contas (saída)
  const existingContas = await db
    .select()
    .from(transactionTypes)
    .where(and(eq(transactionTypes.name, "Contas"), eq(transactionTypes.type, "out")))
    .limit(1);
  if (existingContas.length === 0) {
    await db.insert(transactionTypes).values({ name: "Contas", type: "out" });
    console.log("  ✅ Tipo 'Contas' (saída) criado");
  } else {
    console.log("  ⏭️  Tipo 'Contas' (saída) já existe");
  }

  console.log("🌱 Seed concluído!");
  await pool.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
