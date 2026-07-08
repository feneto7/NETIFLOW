// Utilidades de formatação
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Formata número para moeda brasileira (input)
// Ex: "1000" → "1.000,00" | "12345" → "12.345,00" | "" → ""
export function formatCurrencyInput(rawValue: string): string {
  // Remove tudo que não é dígito
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return "";
  
  // Converte para número (centavos)
  const value = parseInt(digits, 10) / 100;
  
  // Formata como moeda brasileira sem o R$
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Converte string formatada para número
// Ex: "1.000,00" → 1000 | "" → 0
export function parseCurrency(formattedValue: string): number {
  if (!formattedValue) return 0;
  // Remove pontos e troca vírgula por ponto
  const cleaned = formattedValue.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
