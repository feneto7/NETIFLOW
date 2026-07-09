const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load .env.local
const envPath = process.env.NEXT_ENV_PATH || (fs.existsSync(path.resolve(process.cwd(), ".env.local"))
  ? path.resolve(process.cwd(), ".env.local")
  : path.join(__dirname, "../../.env.local"));

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

const dbUrl = process.env.DATABASE_URL;

async function setupDatabase() {
  if (!dbUrl) {
    console.error("⚠️ DATABASE_URL não encontrada. Pulando setup automático.");
    return;
  }

  console.log("🚀 Iniciando setup automático do banco de dados...");

  // Parse DATABASE_URL
  // Format: postgresql://postgres:password@localhost:5432/app_db
  const urlObj = new URL(dbUrl);
  const targetDbName = urlObj.pathname.replace("/", "");
  const defaultDbUrl = dbUrl.replace(targetDbName, "postgres");

  // 1. Criar banco de dados se não existir
  const clientMaster = new Client({ connectionString: defaultDbUrl });
  try {
    await clientMaster.connect();
    const res = await clientMaster.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDbName]);
    if (res.rowCount === 0) {
      console.log(`📦 Criando banco de dados '${targetDbName}'...`);
      await clientMaster.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`✅ Banco de dados '${targetDbName}' criado com sucesso.`);
    } else {
      console.log(`⏭️  Banco de dados '${targetDbName}' já existe.`);
    }
  } catch (error) {
    console.error("❌ Erro ao verificar/criar banco de dados:", error);
    process.exit(1);
  } finally {
    await clientMaster.end();
  }

  // 2. Conectar no banco alvo para criar tabelas e inserir seeds
  const clientApp = new Client({ connectionString: dbUrl });
  try {
    await clientApp.connect();

    console.log("🏗️  Criando tabelas (se não existirem)...");
    await clientApp.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "key" text PRIMARY KEY NOT NULL,
        "value" text NOT NULL
      );
    `);

    await clientApp.query(`
      CREATE TABLE IF NOT EXISTS "transaction_types" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "type" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await clientApp.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "type" text NOT NULL,
        "type_id" integer REFERENCES transaction_types(id),
        "amount" numeric(14, 2) NOT NULL,
        "transaction_date" timestamp NOT NULL,
        "confirmation_date" timestamp NOT NULL,
        "active" boolean DEFAULT true NOT NULL,
        "external_id" text,
        "external_source" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("✅ Tabelas verificadas/criadas com sucesso.");

    // 3. Rodar Seeds
    console.log("🌱 Executando seeds...");
    
    // NFCE (in)
    const nfceRes = await clientApp.query(`SELECT 1 FROM "transaction_types" WHERE "name" = 'NFCE' AND "type" = 'in' LIMIT 1`);
    if (nfceRes.rowCount === 0) {
      await clientApp.query(`INSERT INTO "transaction_types" ("name", "type") VALUES ('NFCE', 'in')`);
      console.log("  ✅ Tipo 'NFCE' (entrada) criado");
    } else {
      console.log("  ⏭️  Tipo 'NFCE' (entrada) já existe");
    }

    // Contas (out)
    const contasRes = await clientApp.query(`SELECT 1 FROM "transaction_types" WHERE "name" = 'Contas' AND "type" = 'out' LIMIT 1`);
    if (contasRes.rowCount === 0) {
      await clientApp.query(`INSERT INTO "transaction_types" ("name", "type") VALUES ('Contas', 'out')`);
      console.log("  ✅ Tipo 'Contas' (saída) criado");
    } else {
      console.log("  ⏭️  Tipo 'Contas' (saída) já existe");
    }

    console.log("🎉 Setup completo!");

  } catch (error) {
    console.error("❌ Erro ao configurar tabelas/seeds:", error);
    process.exit(1);
  } finally {
    await clientApp.end();
  }
}

module.exports = { setupDatabase };
