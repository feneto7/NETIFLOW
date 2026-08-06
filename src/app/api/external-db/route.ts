import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/session";

const EXTERNAL_DB_KEY = "external_db_name";

export async function GET() {
  const authRes = await requireAuth();
  if (authRes) return authRes;

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
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const body = await req.json();
  const { dbName } = body;

  if (!dbName || typeof dbName !== "string") {
    return NextResponse.json({ error: "dbName is required" }, { status: 400 });
  }

  // Validação estrita contra SQL Injection
  const cleanDbName = dbName.trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(cleanDbName)) {
    return NextResponse.json({ error: "Nome de banco de dados inválido" }, { status: 400 });
  }

  const dbUrl = new URL(process.env.DATABASE_URL || "");
  const dbPassword = dbUrl.password;

  // Testar conexão com o banco externo antes de salvar
  const testPool = new Pool({
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: dbPassword,
    database: cleanDbName,
  });

  try {
    const client = await testPool.connect();
    await client.query("SELECT 1");
    client.release();
  } catch (e) {
    await testPool.end();
    return NextResponse.json(
      { error: `Não foi possível conectar ao banco "${cleanDbName}". Verifique o nome.` },
      { status: 400 }
    );
  } finally {
    await testPool.end();
  }

  // Salvar configuração no banco
  await db
    .insert(settings)
    .values({ key: EXTERNAL_DB_KEY, value: cleanDbName })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: cleanDbName },
    });

  // Salvar num arquivo config.txt na raiz da instalação
  try {
    const installDir = process.env.INSTALL_DIR || process.cwd();
    const configPath = path.join(installDir, "config.txt");
    fs.writeFileSync(configPath, `EXTERNAL_DB_NAME=${cleanDbName}\n`, "utf8");
  } catch (err) {
    console.error("Erro ao gravar config.txt:", err);
  }

  return NextResponse.json({ ok: true, dbName: cleanDbName });
}
