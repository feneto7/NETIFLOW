"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createUser(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Usuário e senha são obrigatórios." };
  }

  // Validação de segurança básica da senha (min 8 caracteres)
  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  try {
    // Hash da senha com cost factor 10 (padrão seguro e performático para a maioria dos casos)
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      username,
      password: hashedPassword,
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
