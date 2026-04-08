import mysql from 'mysql2';
import type { DateFilterModel } from 'ag-grid-community';
import { createSqlService, sqlStringLiteral, validateDate } from './shared-service.js';

if (!process.env.MYSQL_URL) {
  throw new Error('MYSQL_URL is required');
}

const connection = mysql.createConnection(process.env.MYSQL_URL);
const promiseConnection = connection.promise();

const dateRangeSql = (key: string, start: string, end: string) => `${key} >= ${start} and ${key} < ${end}`;
const mysqlTimestampLiteral = (value: string | null | undefined) =>
  sqlStringLiteral(`${validateDate(value)} 00:00:00`);

const datePresetFilters = {
  today: (key: string) => dateRangeSql(key, 'CURRENT_DATE()', 'CURRENT_DATE() + INTERVAL 1 DAY'),
  yesterday: (key: string) => dateRangeSql(key, 'CURRENT_DATE() - INTERVAL 1 DAY', 'CURRENT_DATE()'),
  tomorrow: (key: string) => dateRangeSql(key, 'CURRENT_DATE() + INTERVAL 1 DAY', 'CURRENT_DATE() + INTERVAL 2 DAY'),
  thisWeek: (key: string) =>
    dateRangeSql(
      key,
      'CURRENT_DATE() - INTERVAL WEEKDAY(CURRENT_DATE()) DAY',
      'CURRENT_DATE() - INTERVAL WEEKDAY(CURRENT_DATE()) DAY + INTERVAL 7 DAY',
    ),
  lastWeek: (key: string) =>
    dateRangeSql(
      key,
      'CURRENT_DATE() - INTERVAL WEEKDAY(CURRENT_DATE()) DAY - INTERVAL 7 DAY',
      'CURRENT_DATE() - INTERVAL WEEKDAY(CURRENT_DATE()) DAY',
    ),
  nextWeek: (key: string) =>
    dateRangeSql(
      key,
      'CURRENT_DATE() - INTERVAL WEEKDAY(CURRENT_DATE()) DAY + INTERVAL 7 DAY',
      'CURRENT_DATE() - INTERVAL WEEKDAY(CURRENT_DATE()) DAY + INTERVAL 14 DAY',
    ),
  thisMonth: (key: string) =>
    dateRangeSql(
      key,
      "DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')",
      "DATE_FORMAT(CURRENT_DATE() + INTERVAL 1 MONTH, '%Y-%m-01')",
    ),
  lastMonth: (key: string) =>
    dateRangeSql(
      key,
      "DATE_FORMAT(CURRENT_DATE() - INTERVAL 1 MONTH, '%Y-%m-01')",
      "DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')",
    ),
  nextMonth: (key: string) =>
    dateRangeSql(
      key,
      "DATE_FORMAT(CURRENT_DATE() + INTERVAL 1 MONTH, '%Y-%m-01')",
      "DATE_FORMAT(CURRENT_DATE() + INTERVAL 2 MONTH, '%Y-%m-01')",
    ),
  thisQuarter: (key: string) =>
    dateRangeSql(
      key,
      "MAKEDATE(YEAR(CURRENT_DATE()), 1) + INTERVAL QUARTER(CURRENT_DATE()) * 3 - 3 MONTH",
      "MAKEDATE(YEAR(CURRENT_DATE()), 1) + INTERVAL QUARTER(CURRENT_DATE()) * 3 MONTH",
    ),
  lastQuarter: (key: string) =>
    dateRangeSql(
      key,
      "MAKEDATE(YEAR(CURRENT_DATE() - INTERVAL 3 MONTH), 1) + INTERVAL QUARTER(CURRENT_DATE() - INTERVAL 3 MONTH) * 3 - 3 MONTH",
      "MAKEDATE(YEAR(CURRENT_DATE()), 1) + INTERVAL QUARTER(CURRENT_DATE()) * 3 - 3 MONTH",
    ),
  nextQuarter: (key: string) =>
    dateRangeSql(
      key,
      "MAKEDATE(YEAR(CURRENT_DATE() + INTERVAL 3 MONTH), 1) + INTERVAL QUARTER(CURRENT_DATE() + INTERVAL 3 MONTH) * 3 - 3 MONTH",
      "MAKEDATE(YEAR(CURRENT_DATE() + INTERVAL 3 MONTH), 1) + INTERVAL QUARTER(CURRENT_DATE() + INTERVAL 3 MONTH) * 3 MONTH",
    ),
  thisYear: (key: string) => dateRangeSql(key, 'MAKEDATE(YEAR(CURRENT_DATE()), 1)', 'MAKEDATE(YEAR(CURRENT_DATE()) + 1, 1)'),
  lastYear: (key: string) => dateRangeSql(key, 'MAKEDATE(YEAR(CURRENT_DATE()) - 1, 1)', 'MAKEDATE(YEAR(CURRENT_DATE()), 1)'),
  nextYear: (key: string) => dateRangeSql(key, 'MAKEDATE(YEAR(CURRENT_DATE()) + 1, 1)', 'MAKEDATE(YEAR(CURRENT_DATE()) + 2, 1)'),
  yearToDate: (key: string) => dateRangeSql(key, 'MAKEDATE(YEAR(CURRENT_DATE()), 1)', 'CURRENT_DATE() + INTERVAL 1 DAY'),
  last7Days: (key: string) => dateRangeSql(key, 'CURRENT_DATE() - INTERVAL 7 DAY', 'CURRENT_DATE() + INTERVAL 1 DAY'),
  last30Days: (key: string) => dateRangeSql(key, 'CURRENT_DATE() - INTERVAL 30 DAY', 'CURRENT_DATE() + INTERVAL 1 DAY'),
  last90Days: (key: string) => dateRangeSql(key, 'CURRENT_DATE() - INTERVAL 90 DAY', 'CURRENT_DATE() + INTERVAL 1 DAY'),
  last6Months: (key: string) => dateRangeSql(key, 'CURRENT_DATE() - INTERVAL 6 MONTH', 'CURRENT_DATE() + INTERVAL 1 DAY'),
  last12Months: (key: string) => dateRangeSql(key, 'CURRENT_DATE() - INTERVAL 12 MONTH', 'CURRENT_DATE() + INTERVAL 1 DAY'),
  last24Months: (key: string) => dateRangeSql(key, 'CURRENT_DATE() - INTERVAL 24 MONTH', 'CURRENT_DATE() + INTERVAL 1 DAY'),
};

const dateFilters = {
  equals: (key: string, item: DateFilterModel) =>
    dateRangeSql(key, mysqlTimestampLiteral(item.dateFrom), `${mysqlTimestampLiteral(item.dateFrom)} + INTERVAL 1 DAY`),
  notEqual: (key: string, item: DateFilterModel) =>
    `${key} is not null and not (${dateRangeSql(
      key,
      mysqlTimestampLiteral(item.dateFrom),
      `${mysqlTimestampLiteral(item.dateFrom)} + INTERVAL 1 DAY`,
    )})`,
  greaterThan: (key: string, item: DateFilterModel) => `${key} >= ${mysqlTimestampLiteral(item.dateFrom)} + INTERVAL 1 DAY`,
  greaterThanOrEqual: (key: string, item: DateFilterModel) => `${key} >= ${mysqlTimestampLiteral(item.dateFrom)}`,
  lessThan: (key: string, item: DateFilterModel) => `${key} < ${mysqlTimestampLiteral(item.dateFrom)}`,
  lessThanOrEqual: (key: string, item: DateFilterModel) => `${key} < ${mysqlTimestampLiteral(item.dateFrom)} + INTERVAL 1 DAY`,
  inRange: (key: string, item: DateFilterModel) =>
    dateRangeSql(key, mysqlTimestampLiteral(item.dateFrom), `${mysqlTimestampLiteral(item.dateTo)} + INTERVAL 1 DAY`),
  blank: (key: string) => `${key} is null`,
  notBlank: (key: string) => `${key} is not null`,
};

const mysqlService = createSqlService({
  query: async (sql: string) => {
    const [results] = await promiseConnection.query(sql);
    return results as unknown[];
  },
  tableName: process.env.DB_TABLE_NAME || process.env.MYSQL_TABLE_NAME || 'sample_data.olympic_winners',
  dateFilters,
  datePresetFilters,
});

export default mysqlService;
