import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings, transactions, transactionTypes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Pool } from "pg";

const EXTERNAL_DB_KEY = "external_db_name";

import { requireAuth } from "@/lib/session";

export async function POST() {
  const authRes = await requireAuth();
  if (authRes) return authRes;
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

  const dbUrl = new URL(process.env.DATABASE_URL || "");
  const dbPassword = dbUrl.password;

  // 3. Conectar ao banco externo
  const extPool = new Pool({
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: dbPassword,
    database: externalDbName,
  });

  try {
    const client = await extPool.connect();

    // ==========================================
    // SINCRONIZAR NFC-E (Entradas) — somente pagamentos em DINHEIRO (cod_forma_pg = 2)
    // ==========================================
    const nfceResult = await client.query(
      `SELECT
         s.cod_saida,
         s.data_saida,
         s.total_saida,
         fp.forma_pg,
         n.numero AS numero_nfce,
         n.chaveacesso
       FROM public.saida s
       JOIN public.nfce n
         ON n.cod_saida = s.cod_saida
       JOIN public.saida_fpg sf
         ON sf.cod_saida = s.cod_saida
       JOIN public.forma_pgto fp
         ON fp.cod_forma_pgto = sf.cod_forma_pg
       WHERE n.ambiente = 'PRODUCAO'
         AND n.status = 'AUTORIZADO'
         AND sf.cod_forma_pg = 2`
    );
    const nfces = nfceResult.rows;

    const existingNfceRows = await db
      .select({ externalId: transactions.externalId })
      .from(transactions)
      .where(eq(transactions.externalSource, "nfce"));
    const existingNfceIds = new Set(existingNfceRows.map((r) => r.externalId));

    // Usa cod_saida como chave de deduplicação
    const newNfces = nfces.filter((n) => !existingNfceIds.has(String(n.cod_saida)));

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

    // Preparar inserções NFC-e (pagamentos em dinheiro)
    for (const n of newNfces) {
      const date = new Date(n.data_saida);
      valuesToInsert.push({
        type: "in",
        typeId: nfceType.id,
        amount: String(Number(n.total_saida)),
        transactionDate: date,
        confirmationDate: date,
        externalId: String(n.cod_saida),
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
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < valuesToInsert.length; i += CHUNK_SIZE) {
        const chunk = valuesToInsert.slice(i, i + CHUNK_SIZE);
        await db.insert(transactions).values(chunk);
      }
    }

    return NextResponse.json({
      imported: valuesToInsert.length,
      message: `${newNfces.length} NFC-e(s) e ${newContas.length} conta(s) importada(s).`,
    });
  } catch (e: any) {
    console.error("Sync external error:", e);
    return NextResponse.json(
      { error: "Erro na sincronização. Verifique os logs do servidor para mais detalhes." },
      { status: 500 }
    );
  } finally {
    await extPool.end();
  }
}
