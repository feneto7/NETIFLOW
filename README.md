# NETIFLOW Cash Flow System

Este projeto é um sistema de fluxo de caixa construído com Next.js, Electron, Drizzle ORM e PostgreSQL.

## 🚀 Como rodar o projeto localmente

Siga os passos abaixo para configurar e rodar o projeto na sua máquina.

### 1. Requisitos

- [Node.js](https://nodejs.org/) instalado
- [PostgreSQL](https://www.postgresql.org/) rodando localmente (porta padrão 5432)

### 2. Instalar dependências

Na raiz do projeto, execute o comando:

```bash
npm install
```

### 3. Configurar o Banco de Dados (PostgreSQL)

O projeto exige uma conexão com o banco de dados. Para configurar o PostgreSQL localmente, você deve criar um arquivo de variáveis de ambiente na raiz do projeto.

1. Crie um arquivo chamado `.env.local` na raiz da pasta `NETIFLOW`.
2. Adicione a seguinte variável com a sua connection string do banco de dados local:

```env
# Formato: postgresql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
DATABASE_URL=postgresql://postgres:senhabanco@127.0.0.1:5432/app_db
```

> **Aviso:** O arquivo `src/db/index.ts` está configurado para forçar a leitura do arquivo `.env.local`, por isso certifique-se de usar esse nome exato. A string acima está conforme o padrão encontrado no `drizzle.config.json`.

### 4. Rodar a aplicação

Para rodar o projeto completo em ambiente de desenvolvimento (incluindo a janela do **Electron** junta com o **Next.js**), utilize:

```bash
npm run dev:electron
```

Se desejar testar apenas o frontend web no navegador (Next.js sozinho), utilize:

```bash
npm run dev
```

---

## 💾 Scripts Extras

- **Rodar Seeds (Popular banco de dados)**:
  ```bash
  npm run seed
  ```
- **Fazer Build (Produção)**:
  ```bash
  npm run build:electron
  ```
