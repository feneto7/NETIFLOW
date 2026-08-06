import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/db";
import { transactionTypes, transactions } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function GET() {
  const authRes = await requireAuth();
  if (authRes) return authRes;
  
  const list = await db
    .select()
    .from(transactionTypes)
    .orderBy(asc(transactionTypes.type), asc(transactionTypes.name));
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const body = await req.json();
  const { name, type } = body;
  if (!name || !["in", "out"].includes(type)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const [row] = await db
    .insert(transactionTypes)
    .values({ name, type })
    .returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const authRes = await requireAuth();
  if (authRes) return authRes;

  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  const id = parseInt(idParam || "", 10);

  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // Verificar se existem lançamentos vinculados a este tipo
  const linkedTransactions = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.typeId, id))
    .limit(1);

  if (linkedTransactions.length > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir este tipo pois existem lançamentos vinculados a ele." },
      { status: 400 }
    );
  }

  await db.delete(transactionTypes).where(eq(transactionTypes.id, id));
  return NextResponse.json({ ok: true });
}
