"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, KeyRound, User, Eye, EyeOff } from "lucide-react";
import { login } from "../actions/auth";
import Image from "next/image";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        router.push("/");
      }
    });
  }

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 shadow-2xl transition-all duration-300 hover:border-zinc-700">
      <div className="flex flex-col items-center mb-8">
        <div className="w-32 h-32 mb-4 flex items-center justify-center drop-shadow-2xl">
          <Image
            src="/img/logo.png"
            alt="Logo Netiflow"
            width={128}
            height={128}
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Acesso Restrito</h2>
        <p className="text-zinc-400 text-sm text-center">
          Faça login para acessar o Netiflow
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Campo Usuário */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Usuário
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="username"
                id="username"
                required
                disabled={isPending}
                autoComplete="username"
                className="block w-full pl-10 pr-3 py-3 border border-zinc-700 rounded-lg bg-zinc-950/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Digite seu usuário"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Senha
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                required
                disabled={isPending}
                autoComplete="current-password"
                className="block w-full pl-10 pr-12 py-3 border border-zinc-700 rounded-lg bg-zinc-950/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
              {/* Botão para mostrar/ocultar a senha */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Validando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Entrar no Sistema
              <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
