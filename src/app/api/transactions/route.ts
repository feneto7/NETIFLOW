import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionTypes, settings } from "@/db/schema";
import { and, eq, asc, desc, sql, lt, gt, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");
  const pageParam = searchParams.get("page");

  const page = pageParam ? parseInt(pageParam, 10) : 0;

  // Determinar mês selecionado
  const now = new Date();
  let selectedYear = now.getFullYear();
  let selectedMonth = now.getMonth() + 1;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    selectedYear = y;
    selectedMonth = m;
  }
  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  // Buscar saldo inicial global e data inicial
  const settingsRows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, ["initial_balance", "initial_balance_date"]));

  let globalInitialBalance = 0;
  let globalInitialBalanceDate: string | null = null;

  settingsRows.forEach((row) => {
    if (row.key === "initial_balance") globalInitialBalance = parseFloat(row.value);
    if (row.key === "initial_balance_date") globalInitialBalanceDate = row.value;
  });

  // Helper condition to ignore transactions on or before the initial balance date
  const cutoffCondition = globalInitialBalanceDate 
    ? gt(sql`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM-DD')`, globalInitialBalanceDate)
    : undefined;

  // 1. Obter dias distintos no mês (para montar as "páginas")
  const distinctDaysResult = await db
    .select({
      dayString: sql<string>`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM-DD')`,
    })
    .from(transactions)
    .where(and(
      eq(sql`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM')`, selectedMonthKey),
      cutoffCondition
    ))
    .groupBy(sql`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM-DD')`)
    .orderBy(desc(sql`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM-DD')`));

  const availableDays = distinctDaysResult.map(r => r.dayString);

  // 2. Resumo do Mês
  const monthTotalsResult = await db
    .select({
      totalIn: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'in' AND ${transactions.active} = true THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalOut: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'out' AND ${transactions.active} = true THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(and(
      eq(sql`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM')`, selectedMonthKey),
      cutoffCondition
    ));

  const beforeMonthResult = await db
    .select({
      totalIn: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'in' AND ${transactions.active} = true THEN ${transactions.amount} ELSE 0 END), 0)`,
      totalOut: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'out' AND ${transactions.active} = true THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(and(
      lt(sql`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM')`, selectedMonthKey),
      cutoffCondition
    ));

  const monthStartBalance = globalInitialBalance 
    + Number(beforeMonthResult[0]?.totalIn || 0) 
    - Number(beforeMonthResult[0]?.totalOut || 0);

  const monthEndBalance = monthStartBalance 
    + Number(monthTotalsResult[0]?.totalIn || 0) 
    - Number(monthTotalsResult[0]?.totalOut || 0);

  // 3. Buscar as transações apenas do dia solicitado (página)
  let dayTransactions: any[] = [];
  let dayStartBalance = globalInitialBalance;

  if (availableDays.length > 0 && page >= 0 && page < availableDays.length) {
    const selectedDayString = availableDays[page];

    const beforeDayResult = await db
      .select({
        totalIn: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'in' AND ${transactions.active} = true THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalOut: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'out' AND ${transactions.active} = true THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(and(
        lt(sql`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM-DD')`, selectedDayString),
        cutoffCondition
      ));

    dayStartBalance = globalInitialBalance 
      + Number(beforeDayResult[0]?.totalIn || 0) 
      - Number(beforeDayResult[0]?.totalOut || 0);

    const rawDayTxs = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        typeId: transactions.typeId,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        confirmationDate: transactions.confirmationDate,
        active: transactions.active,
        createdAt: transactions.createdAt,
        typeName: transactionTypes.name,
      })
      .from(transactions)
      .leftJoin(transactionTypes, eq(transactions.typeId, transactionTypes.id))
      .where(and(
        eq(sql`TO_CHAR(DATE(${transactions.confirmationDate}), 'YYYY-MM-DD')`, selectedDayString),
        cutoffCondition
      ))
      .orderBy(asc(transactions.confirmationDate), asc(transactions.createdAt));

    let runningBalance = dayStartBalance;
    const computedTxs = rawDayTxs.map((t) => {
      const amt = parseFloat(t.amount as string);
      if (t.active) {
        if (t.type === "in") runningBalance += amt;
        else runningBalance -= amt;
      }
      return {
        ...t,
        amount: amt,
        balance: Math.round(runningBalance * 100) / 100,
      };
    });

    dayTransactions = computedTxs.reverse();
  }

  return NextResponse.json({
    month: selectedMonthKey,
    globalInitialBalance,
    globalInitialBalanceDate,
    monthStartBalance,
    monthEndBalance,
    availableDays,
    currentPage: page,
    totalPages: availableDays.length,
    transactions: dayTransactions,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { type, typeId, amount, transactionDate, confirmationDate } = body;

  if (!type || !["in", "out"].includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });
  }
  if (!transactionDate) {
    return NextResponse.json({ error: "transactionDate required" }, { status: 400 });
  }
  if (!confirmationDate) {
    return NextResponse.json({ error: "confirmationDate required" }, { status: 400 });
  }

  const [row] = await db
    .insert(transactions)
    .values({
      type,
      typeId: typeId ? Number(typeId) : null,
      amount: String(amount),
      transactionDate: new Date(transactionDate),
      confirmationDate: new Date(confirmationDate),
    })
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.update(transactions).set({ active: false }).where(eq(transactions.id, Number(id)));
  return NextResponse.json({ ok: true });
}
