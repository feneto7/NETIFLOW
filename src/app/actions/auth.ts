"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/session";

// In-memory rate limiting for login attempts
const rateLimit = new Map<string, { attempts: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos

export async function login(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  
  if (!username || !password) {
    return { error: "Usuário e senha são obrigatórios." };
  }

  // Rate Limiting check
  const rl = rateLimit.get(username);
  if (rl) {
    if (Date.now() < rl.lockedUntil) {
      const remainingMinutes = Math.ceil((rl.lockedUntil - Date.now()) / 60000);
      return { error: `Muitas tentativas. Tente novamente em ${remainingMinutes} minuto(s).` };
    } else if (Date.now() >= rl.lockedUntil) {
      // Expirou o tempo de bloqueio, reseta
      rateLimit.delete(username);
    }
  }

  // Helper para incrementar falhas e retornar mensagem genérica
  const handleFailure = () => {
    const current = rateLimit.get(username) || { attempts: 0, lockedUntil: 0 };
    current.attempts += 1;
    if (current.attempts >= MAX_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCK_TIME_MS;
    }
    rateLimit.set(username, current);
    return { error: "Usuário ou senha inválidos." }; // Mensagem genérica para evitar enumeração
  };

  try {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = result[0];

    if (!user) {
      return handleFailure();
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      // Sucesso no login, limpa tentativas
      rateLimit.delete(username);

      // Gera o JWT da sessão
      const sessionData = await encrypt({ id: user.id, username: user.username });

      const cookieStore = await cookies();
      cookieStore.set("auth_session", sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict", // Maior segurança
        path: "/",
        // Sem maxAge: continua sendo um Session Cookie (expira ao fechar o app)
      });
      return { success: true };
    } else {
      return handleFailure();
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
