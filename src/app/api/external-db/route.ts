import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const EXTERNAL_DB_KEY = "external_db_name";

export async function GET() {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, EXTERNAL_DB_KEY))
    .limit(1);

  return NextResponse.json({
    dbName: row?.value ?? "",
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { dbName } = body;

  if (!dbName || typeof dbName !== "string") {
    return NextResponse.json({ error: "dbName is required" }, { status: 400 });
  }

  const dbUrl = new URL(process.env.DATABASE_URL || "");
  const dbPassword = dbUrl.password;

  // Testar conexão com o banco externo antes de salvar
  const testPool = new Pool({
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: dbPassword,
    database: dbName.trim(),
  });

  try {
    const client = await testPool.connect();
    await client.query("SELECT 1");
    client.release();
  } catch (e) {
    await testPool.end();
    return NextResponse.json(
      { error: `Não foi possível conectar ao banco "${dbName}". Verifique o nome.` },
      { status: 400 }
    );
  } finally {
    await testPool.end();
  }

  // Salvar configuração no banco
  await db
    .insert(settings)
    .values({ key: EXTERNAL_DB_KEY, value: dbName.trim() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: dbName.trim() },
    });

  // Salvar num arquivo config.txt na raiz da instalação
  try {
    const installDir = process.env.INSTALL_DIR || process.cwd();
    const configPath = path.join(installDir, "config.txt");
    fs.writeFileSync(configPath, `EXTERNAL_DB_NAME=${dbName.trim()}\n`, "utf8");
  } catch (err) {
    console.error("Erro ao gravar config.txt:", err);
  }

  return NextResponse.json({ ok: true, dbName: dbName.trim() });
}
