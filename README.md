# AG Grid Server-Side Bun Example

This is a barebone repo for loading Ag Grid data with SQL on the server side. Specifically the **[Infinite Row Model](https://www.ag-grid.com/javascript-data-grid/infinite-scrolling/)**. 

_TLDR: Send required columns, filters and sorting as JSON --> server builds SQL --> response with rows_

Legacy official example from AG Grid: https://github.com/ag-grid/ag-grid-server-side-nodejs-example.git

This project does **not** require AG Grid Enterprise. It works with the free AG Grid Community version.

## Get started

1. Install dependencies:
   `bun install`
2. Create the env file:
   `cp .env.example .env`
3. Start MySQL:
   `docker compose up -d`
4. Run the Bun server:
   `bun server`
   or for Postgres:
   `DB_CLIENT=postgres bun server`
5. Run the client html:
   `bun client` for MySQL client
   `bun clientPg` for Postgres client
   or just open the html.
## Features

- Bun-based backend with a single `/olympicWinners` service endpoint
- MySQL- or Postgres-backed filtering, sorting, and paged loading
- AG Grid Community frontend using the Infinite Row Model
- Text, number, bigint, and date filter handling on the backend
- Seed SQL with generated `bigint_value` and `created_at` columns
