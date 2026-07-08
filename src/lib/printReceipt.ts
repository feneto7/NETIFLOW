import { formatBRL, formatDate } from "./format";

export function printReceipt({
  id,
  type,
  typeName,
  amount,
  transactionDate,
  confirmationDate,
}: {
  id: number;
  type: "in" | "out";
  typeName: string;
  amount: number;
  transactionDate: string;
  confirmationDate: string;
}) {
  const isIncome = type === "in";
  
  // Create an iframe to hold the receipt
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const now = new Date();
  const printDate = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR");
  
  // 80mm is ~302px (usually max width for 80mm printers is around 300px-350px depending on margins)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprovante</title>
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            font-family: monospace;
            font-size: 12px;
            color: #000;
            margin: 0;
            padding: 8mm; /* Adjust padding so it doesn't hit the paper edge */
            width: 64mm; /* 80mm paper minus margins */
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .title { font-size: 16px; margin-bottom: 10px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .footer { font-size: 10px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="text-center title bold">
          FLUXO DE CAIXA<br>
          COMPROVANTE
        </div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span>ID TRANSAÇÃO:</span>
          <span>#${id}</span>
        </div>
        
        <div class="row">
          <span>DATA LANÇAMENTO:</span>
          <span>${formatDate(transactionDate)}</span>
        </div>
        
        <div class="row">
          <span>DATA CONFIRMAÇÃO:</span>
          <span>${formatDate(confirmationDate)}</span>
        </div>
        
        <div class="row">
          <span>OPERAÇÃO:</span>
          <span class="bold">${isIncome ? "ENTRADA" : "SAÍDA"}</span>
        </div>
        
        <div class="row">
          <span>TIPO:</span>
          <span>${typeName}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row bold" style="font-size: 14px;">
          <span>VALOR:</span>
          <span>${formatBRL(amount)}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="text-center footer">
          Impresso em: ${printDate}
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for the iframe to load and then print
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Clean up after print dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
}
