import React, { useState, useEffect } from "react";
import { Database } from "lucide-react";
import { Modal } from "./Modal";
import { ModalFooter } from "./ModalFooter";

export function ExternalDbModal({ onClose }: { onClose: () => void }) {
  const [dbName, setDbName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/external-db");
        const json = await res.json();
        setDbName(json.dbName || "");
      } catch (e) {
        console.error("Error loading external db config:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dbName.trim()) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/external-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName: dbName.trim() }),
      });
      const json = await res.json();

      if (res.ok) {
        setFeedback({ type: "success", message: `✅ Conectado ao banco "${json.dbName}" com sucesso!` });
      } else {
        setFeedback({ type: "error", message: json.error || "Erro desconhecido" });
      }
    } catch (e) {
      setFeedback({ type: "error", message: "Erro de conexão com o servidor" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Configuração do Banco Externo"
      onClose={onClose}
      icon={<Database className="w-5 h-5" />}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Nome do Banco de Dados Externo
          </label>
          <input
            type="text"
            value={dbName}
            onChange={(e) => setDbName(e.target.value)}
            required
            autoFocus
            disabled={loading}
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none transition"
            placeholder="ex: cazenda"
          />
          <p className="text-xs text-zinc-500 mt-2">
            Nome do banco PostgreSQL local que contém a tabela <code className="text-zinc-400">nfce</code>.
            Conexão: <code className="text-zinc-400">127.0.0.1:5432</code>
          </p>
        </div>

        {feedback && (
          <div
            className={`px-3 py-2.5 rounded-lg text-sm border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <ModalFooter
          onCancel={onClose}
          submitLabel={saving ? "Testando..." : "Salvar e Testar"}
          submitColor="blue"
          disabled={saving || loading}
        />
      </form>
    </Modal>
  );
}
