"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Wallet,
  Coins,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Trash2,
  Calendar,
  Activity,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Vault,
  Tags,
  FileDown,
  Database,
  RefreshCw,
  Printer,
} from "lucide-react";
import { formatBRL, formatDate, formatCurrencyInput, parseCurrency } from "@/lib/format";
import { generateMonthPDF } from "@/lib/pdf";
import { printReceipt } from "@/lib/printReceipt";

import { TransactionType, MonthData } from "@/types";
import { InitialBalanceModal } from "./modals/InitialBalanceModal";
import { TypesModal } from "./modals/TypesModal";
import { NewTransactionModal } from "./modals/NewTransactionModal";
import { ExternalDbModal } from "./modals/ExternalDbModal";

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [data, setData] = useState<MonthData | null>(null);
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [showInitialBalanceModal, setShowInitialBalanceModal] = useState(false);
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [showExternalDbModal, setShowExternalDbModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  function handleGenerateReport() {
    if (!data) return;
    generateMonthPDF(data);
  }

  const loadTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/transaction-types");
      const json = await res.json();
      setTypes(json);
    } catch (e) {
      console.error("Load types error:", e);
    }
  }, []);

  const loadData = useCallback(async (month: string, page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?month=${month}&page=${page}`);
      const json: MonthData = await res.json();
      setData(json);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    loadData(selectedMonth, currentPage);
  }, [selectedMonth, currentPage, loadData]);

  // Atalho de teclado F2 para abrir modal de novo lançamento
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        setShowNewTransactionModal(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Polling automático de sincronização NFC-e a cada 30 segundos
  useEffect(() => {
    let isMounted = true;

    async function syncNfce() {
      try {
        setSyncing(true);
        const res = await fetch("/api/sync-external", { method: "POST" });
        const json = await res.json();
        if (isMounted) {
          setLastSync(new Date().toLocaleTimeString("pt-BR"));
          if (json.imported > 0) {
            loadData(selectedMonth, currentPage);
          }
        }
      } catch {
        // Silenciosamente ignora erros de sync (banco externo pode não estar configurado)
      } finally {
        if (isMounted) setSyncing(false);
      }
    }

    // Sync inicial ao carregar
    syncNfce();

    // Polling a cada 30 segundos
    const interval = setInterval(syncNfce, 30_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedMonth, currentPage, loadData]);

  function goToPreviousMonth() {
    setSelectedMonth((m) => shiftMonth(m, -1));
    setCurrentPage(0);
  }

  function goToNextMonth() {
    setSelectedMonth((m) => shiftMonth(m, 1));
    setCurrentPage(0);
  }

  function goToCurrentMonth() {
    setSelectedMonth(getCurrentMonthKey());
    setCurrentPage(0);
  }

  async function handleSetInitialBalance(value: number, date: string) {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialBalance: value, initialBalanceDate: date }),
      });
      setShowInitialBalanceModal(false);
      loadData(selectedMonth, currentPage);
    } catch (e) {
      console.error("Error:", e);
    }
  }

  async function handleCreateTransaction(payload: {
    type: "in" | "out";
    typeId: number | null;
    typeName: string | null;
    amount: number;
    transactionDate: string;
    confirmationDate: string;
  }) {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const row = await res.json();
      setShowNewTransactionModal(false);
      loadData(selectedMonth, currentPage);

      // Gerar comprovante
      if (payload.typeName && row) {
        printReceipt({
          id: row.id,
          type: payload.type,
          typeName: payload.typeName,
          amount: payload.amount,
          transactionDate: payload.transactionDate,
          confirmationDate: payload.confirmationDate,
        });
      }
    } catch (e) {
      console.error("Error:", e);
    }
  }

  async function handleDeleteTransaction(id: number) {
    if (!confirm("Deseja desativar este lançamento? Ele não comporá mais o saldo do caixa.")) return;
    try {
      await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      loadData(selectedMonth, currentPage);
    } catch (e) {
      console.error("Error:", e);
    }
  }

  const isCurrentMonth = selectedMonth === getCurrentMonthKey();
  const monthLabel = formatMonthLabel(selectedMonth);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-50 tracking-tight">
                  Fluxo de Caixa
                </h1>
                <p className="text-xs text-zinc-500">Controle financeiro</p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowExternalDbModal(true)}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                title="Configurar banco externo"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Banco Externo</span>
              </button>
              <button
                onClick={() => setShowTypesModal(true)}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Tags className="w-4 h-4 text-violet-400" />
                <span className="hidden sm:inline">Tipos</span>
              </button>
              <button
                onClick={() => setShowInitialBalanceModal(true)}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Coins className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Saldo Inicial</span>
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={!data || data.transactions.length === 0}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Gerar relatório em PDF do mês selecionado"
              >
                <FileDown className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Relatório</span>
              </button>
              <button
                onClick={() => setShowNewTransactionModal(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span>Novo Lançamento</span>
                <kbd className="hidden md:inline-flex items-center justify-center ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-700/30 text-emerald-100 rounded border border-emerald-600/50">
                  F2
                </kbd>
              </button>
            </div>
          </div>
          {/* Indicador de sync */}
          {lastSync && (
            <div className="flex items-center gap-1.5 pb-2 px-4 sm:px-6 lg:px-8">
              <RefreshCw className={`w-3 h-3 text-cyan-400 ${syncing ? "animate-spin" : ""}`} />
              <span className="text-[11px] text-zinc-500">
                Última sincronização: <span className="text-zinc-400">{lastSync}</span>
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navegador de Mês */}
        <div className="mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
            <button
              onClick={goToPreviousMonth}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 hover:text-zinc-100 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={goToCurrentMonth}
              className="flex-1 flex flex-col items-center justify-center px-4 py-1 rounded-lg hover:bg-zinc-800/50 transition-colors"
              title="Ir para o mês atual"
            >
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                {isCurrentMonth ? "Mês Atual" : "Visualizando"}
              </span>
              <h2 className="text-xl font-semibold text-zinc-100 capitalize tracking-tight">
                {monthLabel}
              </h2>
            </button>

            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors ${
                isCurrentMonth
                  ? "bg-zinc-900/30 border-zinc-800/30 text-zinc-700 cursor-not-allowed"
                  : "bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700/50 text-zinc-300 hover:text-zinc-100"
              }`}
              title={isCurrentMonth ? "Mês atual" : "Próximo mês"}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-blue-400" />
                </div>
                <span className="font-medium">Saldo Inicial do Mês</span>
              </div>
              <span className="text-xs text-zinc-600">Abertura</span>
            </div>
            <div className="text-3xl font-bold text-zinc-50 tracking-tight tabular-nums">
              {formatBRL(data?.monthStartBalance ?? 0)}
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              Valor no início de <span className="text-zinc-400 capitalize">{monthLabel}</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Vault className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="font-medium">Saldo Final do Mês</span>
              </div>
              <span className="text-xs text-zinc-600">Fechamento</span>
            </div>
            <div
              className={`text-3xl font-bold tracking-tight tabular-nums ${
                (data?.monthEndBalance ?? 0) >= 0 ? "text-zinc-50" : "text-red-400"
              }`}
            >
              {formatBRL(data?.monthEndBalance ?? 0)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-2">
              <span>Variação:</span>
              <MonthVariation
                start={data?.monthStartBalance ?? 0}
                end={data?.monthEndBalance ?? 0}
              />
            </div>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Lançamentos de{" "}
                <span className="capitalize text-zinc-300">
                  {data?.availableDays?.[currentPage] 
                    ? new Date(data.availableDays[currentPage] + "T00:00:00").toLocaleDateString("pt-BR")
                    : monthLabel}
                </span>
              </h2>
              {data && (
                <span className="ml-2 text-xs text-zinc-500">
                  ({data.transactions.length}{" "}
                  {data.transactions.length === 1 ? "lançamento" : "lançamentos"})
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              {data && data.totalPages > 1 && (
                <div className="flex items-center gap-2 mr-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Dia mais recente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-zinc-400 min-w-[70px] text-center">
                    Pág {currentPage + 1} de {data.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(data.totalPages - 1, p + 1))}
                    disabled={currentPage === data.totalPages - 1}
                    className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Dia anterior"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-300 transition-colors">
                <input 
                  type="checkbox" 
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900/50 text-violet-500 focus:ring-violet-500/50"
                />
                Mostrar desativados
              </label>
              <div className="flex items-center gap-1.5 ml-2 border-l border-zinc-800 pl-4">
                <Activity className="w-3.5 h-3.5" />
                <span>Último lançamento no topo</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center">
              <Activity className="w-5 h-5 text-zinc-600 animate-pulse mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Carregando...</p>
            </div>
          ) : !data || data.transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400 mb-1">
                Nenhum lançamento neste mês
              </p>
              <p className="text-xs text-zinc-600">
                Clique em "Novo Lançamento" para adicionar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900/50">
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Data Lançamento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Data Confirmação
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Saldo Final
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.transactions
                    .filter(t => t.active || showInactive)
                    .map((t) => (
                    <tr
                      key={t.id}
                      className={`hover:bg-zinc-800/30 transition-colors group ${!t.active ? "opacity-50" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">
                          {t.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border w-fit ${
                              t.type === "in"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            {t.type === "in" ? (
                              <ArrowDownLeft className="w-3 h-3" strokeWidth={2.5} />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                            )}
                            {t.type === "in" ? "Entrada" : "Saída"}
                          </span>
                          {t.typeName && (
                            <span className={`text-xs text-zinc-400 pl-1 ${!t.active ? "line-through" : ""}`}>
                              {t.typeName} {!t.active && "(Desativado)"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                        {formatDate(t.transactionDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                        {formatDate(t.confirmationDate)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right tabular-nums ${
                          t.type === "in" ? "text-emerald-400" : "text-red-400"
                        } ${!t.active ? "line-through" : ""}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {t.type === "in" ? "+" : "−"} {formatBRL(t.amount)}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right tabular-nums ${!t.active ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
                        {formatBRL(t.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => printReceipt({
                              id: t.id,
                              type: t.type,
                              typeName: t.typeName || "",
                              amount: t.amount,
                              transactionDate: t.transactionDate,
                              confirmationDate: t.confirmationDate
                            })}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Imprimir Comprovante"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {t.active && (
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Desativar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modais */}
      {showInitialBalanceModal && (
        <InitialBalanceModal
          initialValue={data?.globalInitialBalance ?? 0}
          initialDate={data?.globalInitialBalanceDate ?? null}
          onSubmit={handleSetInitialBalance}
          onClose={() => setShowInitialBalanceModal(false)}
        />
      )}

      {showTypesModal && (
        <TypesModal
          types={types}
          onTypesChange={loadTypes}
          onClose={() => setShowTypesModal(false)}
        />
      )}

      {showNewTransactionModal && (
        <NewTransactionModal
          types={types}
          selectedMonth={selectedMonth}
          onSubmit={handleCreateTransaction}
          onClose={() => setShowNewTransactionModal(false)}
        />
      )}
      {showExternalDbModal && (
        <ExternalDbModal onClose={() => setShowExternalDbModal(false)} />
      )}
    </div>
  );
}

function MonthVariation({ start, end }: { start: number; end: number }) {
  const diff = end - start;
  const pct = start !== 0 ? (diff / Math.abs(start)) * 100 : 0;
  const isPositive = diff >= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${
        isPositive ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {isPositive ? "▲" : "▼"} {formatBRL(Math.abs(diff))}
      {start !== 0 && (
        <span className="text-zinc-500 font-normal">
          ({isPositive ? "+" : ""}
          {pct.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}


