import type { DateFilterModel } from 'ag-grid-community';
import { createSqlService, sqlStringLiteral, validateDate } from './shared-service.js';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is required');
}

const sql = new Bun.SQL(process.env.POSTGRES_URL);

const dateRangeSql = (key: string, start: string, end: string) => `${key} >= ${start} and ${key} < ${end}`;
const postgresTimestampLiteral = (value: string | null | undefined) =>
  `TIMESTAMP ${sqlStringLiteral(`${validateDate(value)} 00:00:00`)}`;

const datePresetFilters = {
  today: (key: string) => dateRangeSql(key, 'CURRENT_DATE', "CURRENT_DATE + INTERVAL '1 day'"),
  yesterday: (key: string) => dateRangeSql(key, "CURRENT_DATE - INTERVAL '1 day'", 'CURRENT_DATE'),
  tomorrow: (key: string) => dateRangeSql(key, "CURRENT_DATE + INTERVAL '1 day'", "CURRENT_DATE + INTERVAL '2 day'"),
  thisWeek: (key: string) => dateRangeSql(key, "date_trunc('week', CURRENT_DATE)::date", "date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 day'"),
  lastWeek: (key: string) =>
    dateRangeSql(
      key,
      "date_trunc('week', CURRENT_DATE)::date - INTERVAL '7 day'",
      "date_trunc('week', CURRENT_DATE)::date",
    ),
  nextWeek: (key: string) =>
    dateRangeSql(
      key,
      "date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 day'",
      "date_trunc('week', CURRENT_DATE)::date + INTERVAL '14 day'",
    ),
  thisMonth: (key: string) => dateRangeSql(key, "date_trunc('month', CURRENT_DATE)::date", "date_trunc('month', CURRENT_DATE)::date + INTERVAL '1 month'"),
  lastMonth: (key: string) =>
    dateRangeSql(
      key,
      "date_trunc('month', CURRENT_DATE)::date - INTERVAL '1 month'",
      "date_trunc('month', CURRENT_DATE)::date",
    ),
  nextMonth: (key: string) =>
    dateRangeSql(
      key,
      "date_trunc('month', CURRENT_DATE)::date + INTERVAL '1 month'",
      "date_trunc('month', CURRENT_DATE)::date + INTERVAL '2 month'",
    ),
  thisQuarter: (key: string) => dateRangeSql(key, "date_trunc('quarter', CURRENT_DATE)::date", "date_trunc('quarter', CURRENT_DATE)::date + INTERVAL '3 month'"),
  lastQuarter: (key: string) =>
    dateRangeSql(
      key,
      "date_trunc('quarter', CURRENT_DATE)::date - INTERVAL '3 month'",
      "date_trunc('quarter', CURRENT_DATE)::date",
    ),
  nextQuarter: (key: string) =>
    dateRangeSql(
      key,
      "date_trunc('quarter', CURRENT_DATE)::date + INTERVAL '3 month'",
      "date_trunc('quarter', CURRENT_DATE)::date + INTERVAL '6 month'",
    ),
  thisYear: (key: string) => dateRangeSql(key, "date_trunc('year', CURRENT_DATE)::date", "date_trunc('year', CURRENT_DATE)::date + INTERVAL '1 year'"),
  lastYear: (key: string) =>
    dateRangeSql(
      key,
      "date_trunc('year', CURRENT_DATE)::date - INTERVAL '1 year'",
      "date_trunc('year', CURRENT_DATE)::date",
    ),
  nextYear: (key: string) =>
    dateRangeSql(
      key,
      "date_trunc('year', CURRENT_DATE)::date + INTERVAL '1 year'",
      "date_trunc('year', CURRENT_DATE)::date + INTERVAL '2 year'",
    ),
  yearToDate: (key: string) => dateRangeSql(key, "date_trunc('year', CURRENT_DATE)::date", "CURRENT_DATE + INTERVAL '1 day'"),
  last7Days: (key: string) => dateRangeSql(key, "CURRENT_DATE - INTERVAL '7 day'", "CURRENT_DATE + INTERVAL '1 day'"),
  last30Days: (key: string) => dateRangeSql(key, "CURRENT_DATE - INTERVAL '30 day'", "CURRENT_DATE + INTERVAL '1 day'"),
  last90Days: (key: string) => dateRangeSql(key, "CURRENT_DATE - INTERVAL '90 day'", "CURRENT_DATE + INTERVAL '1 day'"),
  last6Months: (key: string) => dateRangeSql(key, "CURRENT_DATE - INTERVAL '6 month'", "CURRENT_DATE + INTERVAL '1 day'"),
  last12Months: (key: string) => dateRangeSql(key, "CURRENT_DATE - INTERVAL '12 month'", "CURRENT_DATE + INTERVAL '1 day'"),
  last24Months: (key: string) => dateRangeSql(key, "CURRENT_DATE - INTERVAL '24 month'", "CURRENT_DATE + INTERVAL '1 day'"),
};

const dateFilters = {
  equals: (key: string, item: DateFilterModel) =>
    dateRangeSql(
      key,
      postgresTimestampLiteral(item.dateFrom),
      `${postgresTimestampLiteral(item.dateFrom)} + INTERVAL '1 day'`,
    ),
  notEqual: (key: string, item: DateFilterModel) =>
    `${key} is not null and not (${dateRangeSql(
      key,
      postgresTimestampLiteral(item.dateFrom),
      `${postgresTimestampLiteral(item.dateFrom)} + INTERVAL '1 day'`,
    )})`,
  greaterThan: (key: string, item: DateFilterModel) =>
    `${key} >= ${postgresTimestampLiteral(item.dateFrom)} + INTERVAL '1 day'`,
  greaterThanOrEqual: (key: string, item: DateFilterModel) => `${key} >= ${postgresTimestampLiteral(item.dateFrom)}`,
  lessThan: (key: string, item: DateFilterModel) => `${key} < ${postgresTimestampLiteral(item.dateFrom)}`,
  lessThanOrEqual: (key: string, item: DateFilterModel) =>
    `${key} < ${postgresTimestampLiteral(item.dateFrom)} + INTERVAL '1 day'`,
  inRange: (key: string, item: DateFilterModel) =>
    dateRangeSql(
      key,
      postgresTimestampLiteral(item.dateFrom),
      `${postgresTimestampLiteral(item.dateTo)} + INTERVAL '1 day'`,
    ),
  blank: (key: string) => `${key} is null`,
  notBlank: (key: string) => `${key} is not null`,
};

const postgresService = createSqlService({
  query: async (query: string) => {
    const result = await sql.unsafe(query);
    return result as unknown[];
  },
  tableName: process.env.DB_TABLE_NAME || process.env.POSTGRES_TABLE_NAME || 'public.olympic_winners',
  dateFilters,
  datePresetFilters,
});

export default postgresService;
