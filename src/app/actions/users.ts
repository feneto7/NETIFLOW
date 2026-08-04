"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Usuário e senha são obrigatórios." };
  }

  try {
    await db.insert(users).values({
      username,
      password,
    });
    
    // Revalidar rotas caso necessário
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    // Verificar se é erro de unicidade (código 23505 no Postgres)
    if (error.code === "23505") {
      return { error: "Este usuário já existe." };
    }
    return { error: "Erro ao criar usuário." };
  }
}
