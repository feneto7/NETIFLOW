"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function login(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  
  if (!username || !password) {
    return { error: "Usuário e senha são obrigatórios." };
  }

  try {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = result[0];

    if (!user) {
      return { error: "Usuário não encontrado." };
    }

    if (password === user.password) {
      const cookieStore = await cookies();
      cookieStore.set("auth_session", user.username, {
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      return { success: true };
    } else {
      return { error: "Senha incorreta." };
    }
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return { error: "Erro ao tentar realizar o login." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_session");
  redirect("/login");
}
