import type {
  BigIntFilterModel,
  DateFilterModel,
  FilterModel,
  ICombinedSimpleModel,
  IMultiFilterModel,
  IServerSideGetRowsRequest,
  NumberFilterModel,
  SetFilterModel,
  TextFilterModel,
} from 'ag-grid-community';

type SimpleFilterModel = TextFilterModel | NumberFilterModel | DateFilterModel | BigIntFilterModel;
type CombinedSimpleFilterModel =
  | ICombinedSimpleModel<TextFilterModel>
  | ICombinedSimpleModel<NumberFilterModel>
  | ICombinedSimpleModel<DateFilterModel>
  | ICombinedSimpleModel<BigIntFilterModel>;
type SupportedFilterModel = SimpleFilterModel | CombinedSimpleFilterModel | SetFilterModel | IMultiFilterModel;
type SupportedFilterRecord = Record<string, SupportedFilterModel>;
type NumberFilterHandler = (key: string, item: NumberFilterModel) => string;
type TextFilterHandler = (key: string, item: TextFilterModel) => string;
type BigIntFilterHandler = (key: string, item: BigIntFilterModel) => string;
type DateFilterHandler = (key: string, item: DateFilterModel) => string;
type DatePresetFilterHandler = (key: string) => string;

export type SqlService = {
  getData: (request: IServerSideGetRowsRequest) => Promise<{ rows: unknown[]; lastRow: number | null }>;
  buildSql: (request: IServerSideGetRowsRequest) => string;
  createWhereSql: (request: Pick<IServerSideGetRowsRequest, 'filterModel'>) => string;
  createOrderBySql: (request: Pick<IServerSideGetRowsRequest, 'sortModel'>) => string;
  createLimitOffsetSql: (request: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>) => string;
  getRowCount: (
    request: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>,
    results: unknown[],
  ) => number | null;
  cutResultsToPageSize: (
    request: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>,
    results: unknown[],
  ) => unknown[];
};

type SqlServiceConfig = {
  query: (sql: string) => Promise<unknown[]>;
  tableName: string;
  dateFilters: Record<string, DateFilterHandler>;
  datePresetFilters: Record<string, DatePresetFilterHandler>;
};

export const escapeSqlString = (value: string) => value.replace(/'/g, "''");

export const sqlStringLiteral = (value: string) => `'${escapeSqlString(value)}'`;

const numberFilters: Record<string, NumberFilterHandler> = {
  equals: (key, item) => `${key} = ${item.filter}`,
  notEqual: (key, item) => `${key} != ${item.filter}`,
  greaterThan: (key, item) => `${key} > ${item.filter}`,
  greaterThanOrEqual: (key, item) => `${key} >= ${item.filter}`,
  lessThan: (key, item) => `${key} < ${item.filter}`,
  lessThanOrEqual: (key, item) => `${key} <= ${item.filter}`,
  inRange: (key, item) => `(${key} >= ${item.filter} and ${key} <= ${item.filterTo})`,
};

const textFilters: Record<string, TextFilterHandler> = {
  equals: (key, item) => `${key} = ${sqlStringLiteral(String(item.filter ?? ''))}`,
  notEqual: (key, item) => `${key} != ${sqlStringLiteral(String(item.filter ?? ''))}`,
  contains: (key, item) => `${key} like ${sqlStringLiteral(`%${String(item.filter ?? '')}%`)}`,
  notContains: (key, item) => `${key} not like ${sqlStringLiteral(`%${String(item.filter ?? '')}%`)}`,
  startsWith: (key, item) => `${key} like ${sqlStringLiteral(`${String(item.filter ?? '')}%`)}`,
  endsWith: (key, item) => `${key} like ${sqlStringLiteral(`%${String(item.filter ?? '')}`)}`,
};

const validateBigInt = (value: string | null | undefined) => {
  if (value === null || value === undefined) return value;
  if (/^-?\d+$/.test(value)) return value;
  throw new Error(`Invalid bigint filter value: ${value}`);
};

const bigintFilters: Record<string, BigIntFilterHandler> = {
  equals: (key, item) => `${key} = ${validateBigInt(item.filter)}`,
  notEqual: (key, item) => `${key} != ${validateBigInt(item.filter)}`,
  greaterThan: (key, item) => `${key} > ${validateBigInt(item.filter)}`,
  greaterThanOrEqual: (key, item) => `${key} >= ${validateBigInt(item.filter)}`,
  lessThan: (key, item) => `${key} < ${validateBigInt(item.filter)}`,
  lessThanOrEqual: (key, item) => `${key} <= ${validateBigInt(item.filter)}`,
  inRange: (key, item) => `(${key} >= ${validateBigInt(item.filter)} and ${key} <= ${validateBigInt(item.filterTo)})`,
  blank: key => `${key} is null`,
  notBlank: key => `${key} is not null`,
};

export const validateDate = (value: string | null | undefined) => {
  if (value === null || value === undefined) return value;

  const normalizedValue = value.replace('T', ' ');

  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(normalizedValue)) return normalizedValue.slice(0, 10);
  throw new Error(`Invalid date filter value: ${value}`);
};

export const createSqlService = ({
  query,
  tableName,
  dateFilters,
  datePresetFilters,
}: SqlServiceConfig): SqlService => {
  const leafFilterSql = (key: string, item: SimpleFilterModel) => {
    if (item.type == null) throw new Error(`Missing filter type for column: ${key}`);

    switch (item.filterType) {
      case 'text': {
        const filter = textFilters[item.type];

        if (!filter) throw new Error(`Unsupported ${item.filterType} filter type: ${item.type}`);

        return filter(key, item);
      }
      case 'bigint': {
        const filter = bigintFilters[item.type];

        if (!filter) throw new Error(`Unsupported ${item.filterType} filter type: ${item.type}`);

        return filter(key, item);
      }
      case 'number': {
        const filter = numberFilters[item.type];

        if (!filter) throw new Error(`Unsupported ${item.filterType} filter type: ${item.type}`);

        return filter(key, item);
      }
      case 'date': {
        const presetFilter = datePresetFilters[item.type];

        if (presetFilter) return presetFilter(key);

        const filter = dateFilters[item.type];

        if (!filter) throw new Error(`Unsupported ${item.filterType} filter type: ${item.type}`);

        return filter(key, item);
      }
      default:
        throw new Error(`Unsupported filter type: ${item.filterType}`);
    }
  };

  const filterSql = (key: string, item: SupportedFilterModel | null | undefined): string => {
    if (!item) throw new Error(`Missing filter model for column: ${key}`);

    if ('conditions' in item && 'operator' in item && Array.isArray(item.conditions) && item.conditions.length) {
      const parts = item.conditions.map(condition => filterSql(key, condition));
      return `(${parts.join(item.operator === 'OR' ? ' or ' : ' and ')})`;
    }
    
    return leafFilterSql(key, item);
  };

  const service: SqlService = {
    getData: async (request: IServerSideGetRowsRequest) => {
      console.log('request :', request);
      const sql = service.buildSql(request);
      const results = await query(sql);
      const rows = service.cutResultsToPageSize(request, results);
      const lastRow = service.getRowCount(request, results);

      return { rows, lastRow };
    },

    buildSql: (request: IServerSideGetRowsRequest) => {
      const sql = [
        ' select *',
        ` FROM ${tableName} `,
        service.createWhereSql(request),
        service.createOrderBySql(request),
        service.createLimitOffsetSql(request),
      ].join('');

      console.log(sql, '\r\n\n\n');
      return sql;
    },

    createWhereSql: ({ filterModel }: Pick<IServerSideGetRowsRequest, 'filterModel'>) => {
      const simpleFilterModel = (filterModel ?? null) as FilterModel | null;
      const filterEntries = Object.entries((simpleFilterModel ?? {}) as SupportedFilterRecord);
      const filterParts = filterEntries.map(([key, item]) => filterSql(key, item));

      return filterParts.length ? ` where ${filterParts.join(' and ')}` : '';
    },

    createOrderBySql: ({ sortModel }: Pick<IServerSideGetRowsRequest, 'sortModel'>) => {
      if (!sortModel) return '';

      const sortParts = sortModel.map(item => `${item.colId} ${item.sort}`);

      return sortParts.length ? ` order by ${sortParts.join(', ')}` : '';
    },

    createLimitOffsetSql: ({ startRow, endRow }: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>) =>
      endRow !== undefined && startRow !== undefined ? ` limit ${endRow - startRow + 1} offset ${startRow}` : '',

    getRowCount: (
      { startRow, endRow }: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>,
      results: unknown[],
    ) => {
      if (!results?.length) return null;

      if (startRow === undefined || endRow === undefined) return results.length;

      const currentLastRow = startRow + results.length;
      return currentLastRow <= endRow ? currentLastRow : -1;
    },

    cutResultsToPageSize: (
      { startRow, endRow }: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>,
      results: unknown[],
    ) => {
      if (startRow === undefined || endRow === undefined) return results;

      const pageSize = endRow - startRow;
      return results.length > pageSize ? results.slice(0, pageSize) : results;
    },
  };

  return service;
};
