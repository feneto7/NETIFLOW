import React, { useState } from "react";
import { Coins, Calendar } from "lucide-react";
import { Modal } from "./Modal";
import { ModalFooter } from "./ModalFooter";
import { formatCurrencyInput, parseCurrency } from "@/lib/format";

export function InitialBalanceModal({
  initialValue,
  initialDate,
  onSubmit,
  onClose,
}: {
  initialValue: number;
  initialDate: string | null;
  onSubmit: (value: number, date: string) => void;
  onClose: () => void;
}) {
  const [formattedValue, setFormattedValue] = useState(
    initialValue > 0 ? formatCurrencyInput(String(initialValue * 100)) : ""
  );
  
  const [dateStr, setDateStr] = useState(
    initialDate || new Date().toISOString().split("T")[0]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(parseCurrency(formattedValue), dateStr);
  }

  return (
    <Modal title="Definir Saldo Inicial" onClose={onClose} icon={<Coins className="w-5 h-5" />}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Saldo Inicial Global (R$)
          </label>
          <input
            type="text"
            value={formattedValue}
            onChange={(e) => setFormattedValue(formatCurrencyInput(e.target.value))}
            required
            autoFocus
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition tabular-nums"
            placeholder="0,00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Data de Início (Data de Corte)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-zinc-500" />
            </div>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              required
              className="w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            O sistema ignorará transações anteriores ou iguais a esta data. O cálculo iniciará no dia seguinte a partir do saldo informado acima.
          </p>
        </div>
        
        <div className="pt-2">
          <ModalFooter onCancel={onClose} submitLabel="Salvar" submitColor="blue" />
        </div>
      </form>
    </Modal>
  );
}
