import React, { useState, useMemo } from "react";
import { Plus, Calendar } from "lucide-react";
import { Modal } from "./Modal";
import { ModalFooter } from "./ModalFooter";
import { TransactionType } from "@/types";
import { formatCurrencyInput, parseCurrency } from "@/lib/format";

export function NewTransactionModal({
  types,
  selectedMonth,
  onSubmit,
  onClose,
}: {
  types: TransactionType[];
  selectedMonth: string;
  onSubmit: (data: {
    type: "in" | "out";
    typeId: number | null;
    typeName: string | null;
    amount: number;
    transactionDate: string;
    confirmationDate: string;
  }) => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const todayFormatted = new Date().toLocaleDateString("pt-BR");

  const [typeId, setTypeId] = useState<string>("");
  const [formattedAmount, setFormattedAmount] = useState("");
  const [confirmationDate, setConfirmationDate] = useState(today);

  // Tipo selecionado
  const selectedType = types.find((t) => String(t.id) === typeId) ?? null;
  // Tipos filtrados pelo tipo do tipo selecionado (ou todos se nenhum selecionado)
  const availableTypes = useMemo(() => {
    return [...types].sort((a, b) => {
      if (a.type !== b.type) return a.type === "in" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [types]);

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!formattedAmount || !selectedType) return;
    onSubmit({
      type: selectedType.type,
      typeId: Number(selectedType.id),
      typeName: selectedType.name,
      amount: parseCurrency(formattedAmount),
      transactionDate: today, // Data de lançamento é sempre hoje
      confirmationDate,
    });
  }

  return (
    <Modal title="Novo Lançamento" onClose={onClose} icon={<Plus className="w-5 h-5" />}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Tipo de lançamento */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Tipo de Lançamento
          </label>
          {availableTypes.length === 0 ? (
            <div className="px-3 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-500 text-center">
              Nenhum tipo cadastrado. Cadastre tipos em "Tipos de Lançamento" primeiro.
            </div>
          ) : (
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition"
            >
              <option value="">Selecione um tipo...</option>
              {availableTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.type === "in" ? "↓ Entrada" : "↑ Saída"} — {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Valor */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Valor (R$)
          </label>
          <input
            type="text"
            value={formattedAmount}
            onChange={(e) => setFormattedAmount(formatCurrencyInput(e.target.value))}
            required
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition tabular-nums"
            placeholder="0,00"
          />
        </div>

        {/* Data de Confirmação */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Data Confirmação
          </label>
          <input
            type="date"
            value={confirmationDate}
            onChange={(e) => setConfirmationDate(e.target.value)}
            required
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Define em qual mês aparecerá na listagem
          </p>
        </div>

        {/* Info da data de lançamento */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-500">
            Data de lançamento: <span className="text-zinc-400 font-medium">{todayFormatted}</span> (automática)
          </span>
        </div>

        <ModalFooter
          onCancel={onClose}
          submitLabel="Lançar"
          submitColor="emerald"
          disabled={!selectedType || availableTypes.length === 0}
        />
      </form>
    </Modal>
  );
}
