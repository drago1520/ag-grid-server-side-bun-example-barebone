import mysql from 'mysql2';
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

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'reporting_app',
  password: 'password123',
});

type SimpleFilterModel = TextFilterModel | NumberFilterModel | DateFilterModel | BigIntFilterModel; //{ filterType: 'text', type: 'contains', filter: 'abc' } { filterType: 'number', type: 'greaterThan', filter: 10 }
type CombinedSimpleFilterModel =
  | ICombinedSimpleModel<TextFilterModel>
  | ICombinedSimpleModel<NumberFilterModel>
  | ICombinedSimpleModel<DateFilterModel>
  | ICombinedSimpleModel<BigIntFilterModel>; //{operator: "OR", conditions: SimpleFilterModel[]}
type SupportedFilterModel = SimpleFilterModel | CombinedSimpleFilterModel | SetFilterModel | IMultiFilterModel;
type SupportedFilterRecord = Record<string, SupportedFilterModel>;


const service = {
  getData: (request: IServerSideGetRowsRequest, callback: (rows: unknown[], lastRow: number | null) => void) => {
    const sql = service.buildSql(request);

    connection.query(sql, (error, results) => {
      const rows = service.cutResultsToPageSize(request, results);
      const lastRow = service.getRowCount(request, results);
      callback(rows, lastRow);
    });
  },

  buildSql: (request: IServerSideGetRowsRequest) => {
    const sql = [
      ' select *',
      ' FROM sample_data.olympic_winners ',
      service.createWhereSql(request), //based of different filter models
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
    if (!sortModel) {
      return '';
    }

    const sortParts = sortModel.map(item => `${item.colId} ${item.sort}`);

    return sortParts.length ? ` order by ${sortParts.join(', ')}` : '';
  },

  createLimitOffsetSql: ({ startRow, endRow }: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>) => ` limit ${endRow - startRow + 1} offset ${startRow}`,
  
  getRowCount: ({ startRow, endRow }: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>, results: unknown[]) => {
    if (!results?.length) {
      return null;
    }

    const currentLastRow = startRow + results.length;
    return currentLastRow <= endRow ? currentLastRow : -1;
  },

  cutResultsToPageSize: (
    { startRow, endRow }: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>,
    results: unknown[]
  ) => {
    const pageSize = endRow - startRow;
    return results && results.length > pageSize ? results.slice(0, pageSize) : results;
  },
};

const numberFilters = {
  equals: (key, item) => `${key} = ${item.filter}`,
  notEqual: (key, item) => `${key} != ${item.filter}`,
  greaterThan: (key, item) => `${key} > ${item.filter}`,
  greaterThanOrEqual: (key, item) => `${key} >= ${item.filter}`,
  lessThan: (key, item) => `${key} < ${item.filter}`,
  lessThanOrEqual: (key, item) => `${key} <= ${item.filter}`,
  inRange: (key, item) => `(${key} >= ${item.filter} and ${key} <= ${item.filterTo})`,
};

const textFilters = {
  equals: (key, item) => `${key} = "${item.filter}"`,
  notEqual: (key, item) => `${key} != "${item.filter}"`,
  contains: (key, item) => `${key} like "%${item.filter}%"`,
  notContains: (key, item) => `${key} not like "%${item.filter}%"`,
  startsWith: (key, item) => `${key} like "${item.filter}%"`,
  endsWith: (key, item) => `${key} like "%${item.filter}"`,
};

const leafFilterSql = (key: string, item: SimpleFilterModel) => {
  const filters = item.filterType === 'text' ? textFilters : numberFilters;
  const filter = filters[item.type];

  if (!filter) {
    console.log(`unknown ${item.filterType} filter type: ${item.type}`);
    return 'true';
  }

  return filter(key, item);
};

const filterSql = (key: string, item: SupportedFilterModel | null | undefined): string => {
  if (!item) {
    return 'true';
  }

  if (Array.isArray(item.conditions) && item.conditions.length) {
    const parts = item.conditions.map(condition => filterSql(key, condition));
    return `(${parts.join(item.operator === 'OR' ? ' or ' : ' and ')})`;
  }

  if (item.condition1 || item.condition2) {
    const parts = [item.condition1, item.condition2].filter(Boolean).map(condition => filterSql(key, condition));
    return `(${parts.join(item.operator === 'OR' ? ' or ' : ' and ')})`;
  }

  return leafFilterSql(key, item);
};

export default service;
