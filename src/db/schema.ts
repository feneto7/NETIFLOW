import { pgTable, text, numeric, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";

// Configurações do sistema (chave-valor)
// Chaves utilizadas: 'initial_balance'
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Tipos de lançamento customizáveis
export const transactionTypes = pgTable("transaction_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'in' (entrada) ou 'out' (saída)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Lançamentos do fluxo de caixa
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'in' (entrada) ou 'out' (saída) - copiado do tipo para facilitar cálculos
  typeId: integer("type_id").references(() => transactionTypes.id), // referência ao tipo customizado
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  // Data do lançamento (informada pelo usuário - pode ser passado/futuro)
  transactionDate: timestamp("transaction_date").notNull(),
  // Data de confirmação (quando foi confirmado no sistema) - USADA PARA FILTRO POR MÊS
  confirmationDate: timestamp("confirmation_date").notNull(),
  // Exclusão lógica
  active: boolean("active").default(true).notNull(),
  // Rastreamento de registros importados de sistemas externos
  externalId: text("external_id"), // ID original no sistema externo (ex: id da nfce)
  externalSource: text("external_source"), // Origem: 'nfce', 'contas', etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
