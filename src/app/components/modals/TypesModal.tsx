import React, { useState } from "react";
import { Tags, Plus, ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { TransactionType } from "@/types";

export function TypesModal({
  types,
  onTypesChange,
  onClose,
}: {
  types: TransactionType[];
  onTypesChange: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"in" | "out">("in");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/transaction-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      setName("");
      onTypesChange();
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este tipo?")) return;
    try {
      const res = await fetch(`/api/transaction-types?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao excluir o tipo.");
        return;
      }
      onTypesChange();
    } catch (e) {
      console.error("Error:", e);
      alert("Erro de conexão ao tentar excluir.");
    }
  }

  const inTypes = types.filter((t) => t.type === "in");
  const outTypes = types.filter((t) => t.type === "out");

  return (
    <Modal
      title="Tipos de Lançamento"
      onClose={onClose}
      icon={<Tags className="w-5 h-5" />}
      wide
    >
      <div className="p-6 space-y-5">
        {/* Formulário de criação */}
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do tipo (ex: Vendas, Aluguel, Salários)"
              required
              maxLength={50}
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition"
            />
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setType("in")}
                className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  type === "in"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" />
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setType("out")}
                className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  type === "out"
                    ? "bg-red-500/10 border-red-500/40 text-red-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                Saída
              </button>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-zinc-950 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Cadastrar
            </button>
          </div>
        </form>

        {/* Lista de tipos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Tipos de Entrada ({inTypes.length})
            </h3>
            <div className="space-y-1.5">
              {inTypes.length === 0 ? (
                <p className="text-xs text-zinc-600 py-3 text-center bg-zinc-950/50 rounded-lg border border-dashed border-zinc-800">
                  Nenhum tipo cadastrado
                </p>
              ) : (
                inTypes.map((t) => (
                  <TypeItem key={t.id} type={t} onDelete={() => handleDelete(t.id)} />
                ))
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Tipos de Saída ({outTypes.length})
            </h3>
            <div className="space-y-1.5">
              {outTypes.length === 0 ? (
                <p className="text-xs text-zinc-600 py-3 text-center bg-zinc-950/50 rounded-lg border border-dashed border-zinc-800">
                  Nenhum tipo cadastrado
                </p>
              ) : (
                outTypes.map((t) => (
                  <TypeItem key={t.id} type={t} onDelete={() => handleDelete(t.id)} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TypeItem({ type, onDelete }: { type: TransactionType; onDelete: () => void }) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
        type.type === "in"
          ? "bg-emerald-500/5 border-emerald-500/10"
          : "bg-red-500/5 border-red-500/10"
      }`}
    >
      <span className="text-sm text-zinc-200">{type.name}</span>
      <button
        onClick={onDelete}
        className="text-zinc-600 hover:text-red-400 transition-colors p-1"
        title="Excluir"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
