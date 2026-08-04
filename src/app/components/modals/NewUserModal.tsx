"use client";

import { useState, useTransition } from "react";
import { UserPlus, X, User, KeyRound } from "lucide-react";
import { createUser } from "../../actions/users";

export function NewUserModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createUser(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-100">Novo Usuário</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-zinc-300 mb-2">
              Nome de Usuário
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
                className="block w-full pl-10 pr-3 py-2.5 border border-zinc-700 rounded-lg bg-zinc-950/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Ex: joao.silva"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              Senha
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="password"
                name="password"
                id="password"
                required
                disabled={isPending}
                className="block w-full pl-10 pr-3 py-2.5 border border-zinc-700 rounded-lg bg-zinc-950/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>
            
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-900 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                "Criar Usuário"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
