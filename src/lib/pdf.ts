import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL, formatDate } from "@/lib/format";

type Transaction = {
  id: number;
  type: "in" | "out";
  typeName: string | null;
  amount: number;
  balance: number;
  transactionDate: string;
  confirmationDate: string;
};

type MonthData = {
  month: string;
  globalInitialBalance: number;
  monthStartBalance: number;
  monthEndBalance: number;
  transactions: Transaction[];
};

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function generateMonthPDF(data: MonthData) {
  const doc = new jsPDF();
  const monthLabel = formatMonthLabel(data.month).toUpperCase();

  // Cabeçalho
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("Relatório de Fluxo de Caixa", 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text(`Mês: ${monthLabel}`, 14, 28);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 34);

  // Cards de resumo
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  doc.text("Saldo Inicial do Mês:", 14, 46);
  doc.setFont("helvetica", "bold");
  doc.text(formatBRL(data.monthStartBalance), 60, 46);

  doc.setFont("helvetica", "normal");
  doc.text("Saldo Final do Mês:", 110, 46);
  doc.setFont("helvetica", "bold");
  doc.text(formatBRL(data.monthEndBalance), 156, 46);

  doc.setFont("helvetica", "normal");
  doc.text("Variação:", 14, 53);
  const variation = data.monthEndBalance - data.monthStartBalance;
  doc.setTextColor(variation >= 0 ? 16 : 185, variation >= 0 ? 185 : 74, variation >= 0 ? 129 : 68);
  doc.setFont("helvetica", "bold");
  doc.text(`${variation >= 0 ? "+" : ""}${formatBRL(variation)}`, 60, 53);

  // Linha separadora
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, 57, 196, 57);

  // Tabela de lançamentos (ordenada cronologicamente ASC para o relatório)
  const sortedTransactions = [...data.transactions].reverse();

  const tableData = sortedTransactions.map((t) => {
    const tipo = t.type === "in" ? "Entrada" : "Saída";
    const dataConfirmacao = formatDate(t.confirmationDate);
    const entrada = t.type === "in" ? formatBRL(t.amount) : "";
    const saida = t.type === "out" ? formatBRL(t.amount) : "";
    const saldoFinal = formatBRL(t.balance);
    return [tipo, dataConfirmacao, entrada, saida, saldoFinal];
  });

  autoTable(doc, {
    startY: 62,
    head: [["Tipo", "Data Confirmação", "Entrada", "Saída", "Saldo Final"]],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 2,
      textColor: [40, 40, 40],
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 28, halign: "left" },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 40, halign: "right" },
      3: { cellWidth: 40, halign: "right" },
      4: { cellWidth: 40, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    didParseCell: (hookData) => {
      // Pintar tipo Entrada em verde e Saída em vermelho
      if (hookData.section === "body" && hookData.column.index === 0) {
        const valor = hookData.cell.raw as string;
        if (valor === "Entrada") {
          hookData.cell.styles.textColor = [16, 185, 129];
          hookData.cell.styles.fontStyle = "bold";
        } else if (valor === "Saída") {
          hookData.cell.styles.textColor = [239, 68, 68];
          hookData.cell.styles.fontStyle = "bold";
        }
      }
      // Pintar coluna de valor (entrada ou saída) na mesma cor
      if (hookData.section === "body") {
        const row = hookData.row.raw as string[];
        const tipo = row[0];
        if (hookData.column.index === 2 && tipo === "Entrada") {
          hookData.cell.styles.textColor = [16, 185, 129];
          hookData.cell.styles.fontStyle = "bold";
        }
        if (hookData.column.index === 3 && tipo === "Saída") {
          hookData.cell.styles.textColor = [239, 68, 68];
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Rodapé com totais
  const finalY = (doc as any).lastAutoTable?.finalY || 62;

  const totalEntradas = data.transactions
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSaidas = data.transactions
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalLancamentos = data.transactions.length;

  doc.setDrawColor(220, 220, 220);
  doc.line(14, finalY + 6, 196, finalY + 6);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);

  doc.text(`Total de Entradas:`, 14, finalY + 13);
  doc.setTextColor(16, 185, 129);
  doc.text(formatBRL(totalEntradas), 60, finalY + 13);

  doc.setTextColor(60, 60, 60);
  doc.text(`Total de Saídas:`, 110, finalY + 13);
  doc.setTextColor(239, 68, 68);
  doc.text(formatBRL(totalSaidas), 156, finalY + 13);

  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`Total de lançamentos: ${totalLancamentos}`, 14, finalY + 20);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(`Saldo Final:`, 110, finalY + 20);
  doc.setTextColor(data.monthEndBalance >= 0 ? 20 : 239, data.monthEndBalance >= 0 ? 20 : 68, data.monthEndBalance >= 0 ? 20 : 68);
  doc.text(formatBRL(data.monthEndBalance), 156, finalY + 20);

  // Salvar PDF
  const fileName = `fluxo-caixa-${data.month}.pdf`;
  doc.save(fileName);
}
