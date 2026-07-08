import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings, transactions, transactionTypes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Pool } from "pg";

const EXTERNAL_DB_KEY = "external_db_name";

export async function POST() {
  // 1. Ler o nome do banco externo da configuração
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, EXTERNAL_DB_KEY))
    .limit(1);

  if (!setting?.value) {
    return NextResponse.json(
      { error: "Banco externo não configurado. Configure em 'Banco Externo'." },
      { status: 400 }
    );
  }

  const externalDbName = setting.value;

  // 2. Buscar o typeId dos tipos NFCE e Contas
  const types = await db.select().from(transactionTypes);
  
  const nfceType = types.find((t) => t.name === "NFCE" && t.type === "in");
  const contasType = types.find((t) => t.name === "Contas" && t.type === "out");

  if (!nfceType || !contasType) {
    return NextResponse.json(
      { error: "Tipos 'NFCE' ou 'Contas' não encontrados. Execute o seed: npm run seed" },
      { status: 400 }
    );
  }

  // 3. Conectar ao banco externo
  const extPool = new Pool({
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "2011ThaylaLunaMel2013",
    database: externalDbName,
  });

  try {
    const client = await extPool.connect();

    // ==========================================
    // SINCRONIZAR NFC-E (Entradas)
    // ==========================================
    const nfceResult = await client.query(
      `SELECT id, dataautorizacao, valor
       FROM public.nfce
       WHERE status = 'AUTORIZADO' AND ambiente = 'PRODUCAO'`
    );
    const nfces = nfceResult.rows;

    const existingNfceRows = await db
      .select({ externalId: transactions.externalId })
      .from(transactions)
      .where(eq(transactions.externalSource, "nfce"));
    const existingNfceIds = new Set(existingNfceRows.map((r) => r.externalId));
    
    const newNfces = nfces.filter((n) => !existingNfceIds.has(String(n.id)));

    // ==========================================
    // SINCRONIZAR CONTAS A PAGAR (Saídas)
    // ==========================================
    const contasResult = await client.query(
      `SELECT cod_contas_pagar, pago, valor, data_pg, data_emissao
       FROM public.contas_pagar
       WHERE UPPER(pago) = 'SIM'`
    );
    const contas = contasResult.rows;

    const existingContasRows = await db
      .select({ externalId: transactions.externalId })
      .from(transactions)
      .where(eq(transactions.externalSource, "contas"));
    const existingContasIds = new Set(existingContasRows.map((r) => r.externalId));

    const newContas = contas.filter((c) => !existingContasIds.has(String(c.cod_contas_pagar)));

    client.release();

    if (newNfces.length === 0 && newContas.length === 0) {
      return NextResponse.json({ imported: 0, message: "Tudo sincronizado." });
    }

    const valuesToInsert: any[] = [];

    // Preparar inserções NFC-e
    for (const n of newNfces) {
      const date = new Date(n.dataautorizacao);
      valuesToInsert.push({
        type: "in",
        typeId: nfceType.id,
        amount: String(Number(n.valor)),
        transactionDate: date,
        confirmationDate: date,
        externalId: String(n.id),
        externalSource: "nfce",
      });
    }

    // Preparar inserções Contas
    for (const c of newContas) {
      const transactionDate = new Date(c.data_emissao);
      const confirmationDate = new Date(c.data_pg);
      valuesToInsert.push({
        type: "out",
        typeId: contasType.id,
        amount: String(Number(c.valor)),
        transactionDate: transactionDate,
        confirmationDate: confirmationDate,
        externalId: String(c.cod_contas_pagar),
        externalSource: "contas",
      });
    }

    if (valuesToInsert.length > 0) {
      await db.insert(transactions).values(valuesToInsert);
    }

    return NextResponse.json({
      imported: valuesToInsert.length,
      message: `${newNfces.length} NFC-e(s) e ${newContas.length} conta(s) importada(s).`,
    });
  } catch (e: any) {
    console.error("Sync external error:", e);
    return NextResponse.json(
      { error: `Erro na sincronização: ${e.message}` },
      { status: 500 }
    );
  } finally {
    await extPool.end();
  }
}
