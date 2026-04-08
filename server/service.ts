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
const promiseConnection = connection.promise();

type SimpleFilterModel = TextFilterModel | NumberFilterModel | DateFilterModel | BigIntFilterModel; //{ filterType: 'text', type: 'contains', filter: 'abc' } { filterType: 'number', type: 'greaterThan', filter: 10 }
type CombinedSimpleFilterModel =
  | ICombinedSimpleModel<TextFilterModel>
  | ICombinedSimpleModel<NumberFilterModel>
  | ICombinedSimpleModel<DateFilterModel>
  | ICombinedSimpleModel<BigIntFilterModel>; //{operator: "OR", conditions: SimpleFilterModel[]}
type SupportedFilterModel = SimpleFilterModel | CombinedSimpleFilterModel | SetFilterModel | IMultiFilterModel;
type SupportedFilterRecord = Record<string, SupportedFilterModel>;

const service = {
  getData: async (request: IServerSideGetRowsRequest) => {
  console.log('request :', request);
    const sql = service.buildSql(request);
    const [results] = await promiseConnection.query(sql);
    const rows = service.cutResultsToPageSize(request, results as unknown[]);
    const lastRow = service.getRowCount(request, results as unknown[]);

    return { rows, lastRow };
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
    if (!sortModel) return '';

    const sortParts = sortModel.map(item => `${item.colId} ${item.sort}`);

    return sortParts.length ? ` order by ${sortParts.join(', ')}` : '';
  },

  createLimitOffsetSql: ({ startRow, endRow }: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>) =>
    endRow !== undefined && startRow !== undefined ? ` limit ${endRow - startRow + 1} offset ${startRow}` : '', //return 1 more row to check if it's the end in getRowCount()

  getRowCount: ({ startRow, endRow }: Pick<IServerSideGetRowsRequest, 'startRow' | 'endRow'>, results: unknown[]) => {
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
  const filters = item.filterType === 'text' ? textFilters : numberFilters; //TODO: handle more than text & numbers
  const filter = filters[item.type];

  if (!filter) throw new Error(`Unsupported ${item.filterType} filter type: ${item.type}`);

  return filter(key, item);
};

const filterSql = (key: string, item: SupportedFilterModel | null | undefined): string => {
  if (!item) throw new Error(`Missing filter model for column: ${key}`);

  //only if CombinedSimpleFilterModel
  if ('conditions' in item && 'operator' in item && Array.isArray(item.conditions) && item.conditions.length) {
    const parts = item.conditions.map(condition => filterSql(key, condition));
    return `(${parts.join(item.operator === 'OR' ? ' or ' : ' and ')})`;
  }
  else return leafFilterSql(key, item); //will be fixed, once I handle more filter
};

export default service;
