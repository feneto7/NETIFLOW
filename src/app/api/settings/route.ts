import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { inArray } from "drizzle-orm";

const INITIAL_BALANCE_KEY = "initial_balance";
const INITIAL_BALANCE_DATE_KEY = "initial_balance_date";

export async function GET() {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, [INITIAL_BALANCE_KEY, INITIAL_BALANCE_DATE_KEY]));

  let initialBalance = 0;
  let initialBalanceDate = null;

  rows.forEach((row) => {
    if (row.key === INITIAL_BALANCE_KEY) initialBalance = parseFloat(row.value);
    if (row.key === INITIAL_BALANCE_DATE_KEY) initialBalanceDate = row.value;
  });

  return NextResponse.json({
    initialBalance,
    initialBalanceDate,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { initialBalance, initialBalanceDate } = body;

  if (typeof initialBalance !== "number" || isNaN(initialBalance)) {
    return NextResponse.json({ error: "invalid balance" }, { status: 400 });
  }

  // Update initial balance
  await db
    .insert(settings)
    .values({ key: INITIAL_BALANCE_KEY, value: String(initialBalance) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: String(initialBalance) },
    });

  // Update initial balance date if provided
  if (initialBalanceDate) {
    await db
      .insert(settings)
      .values({ key: INITIAL_BALANCE_DATE_KEY, value: String(initialBalanceDate) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: String(initialBalanceDate) },
      });
  }

  return NextResponse.json({ ok: true, initialBalance, initialBalanceDate });
}
