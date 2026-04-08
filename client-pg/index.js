const datasource = {
  getRows(params) {
    console.log(JSON.stringify(params));

    fetch('http://localhost:4000/olympicWinners', {
      method: 'POST',
      body: JSON.stringify(params), //the obj also contains f()
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
      .then(httpResponse => httpResponse.json())
      .then(response => {
        console.log('response :', response);
        params.successCallback(response.rows, response.lastRow);
      })
      .catch(error => {
        console.error(error);
        params.failCallback();
      });
  },
};

//prettier-ignore
const dateFilterOptions = [ "empty", "equals", "notEqual", "lessThan", "lessThanOrEqual", "greaterThan", "greaterThanOrEqual", "inRange", "blank", "notBlank", "today", "yesterday", "tomorrow", "thisWeek", "lastWeek", "nextWeek", "thisMonth", "lastMonth", "nextMonth", "thisQuarter", "lastQuarter", "nextQuarter", "thisYear", "lastYear", "nextYear", "yearToDate", "last7Days", "last30Days", "last90Days", "last6Months", "last12Months", "last24Months",
];

const gridOptions = {
  rowModelType: 'infinite',
  columnDefs: [
    { field: 'id', filter: 'agBigIntColumnFilter', sort: 'desc' },
    {
      field: 'received_at',
      filter: 'agDateColumnFilter',
      filterParams: {
        filterOptions: dateFilterOptions,
      },
    },
    { field: 'datacenter_id', filter: 'agNumberColumnFilter' },
    { field: 'machine_id', filter: 'agNumberColumnFilter' },
    { field: 'raw_line', filter: 'agTextColumnFilter' },
    { field: 'p1_ohms', filter: 'agNumberColumnFilter' },
    { field: 'p2_ohms', filter: 'agNumberColumnFilter' },
    { field: 'p3_ohms', filter: 'agNumberColumnFilter' },
    { field: 'p4_ohms', filter: 'agNumberColumnFilter' },
    { field: 'p5_ohms', filter: 'agNumberColumnFilter' },
    { field: 'p6_ohms', filter: 'agNumberColumnFilter' },
    { field: 'p1_status_code', filter: 'agNumberColumnFilter' },
    { field: 'p2_status_code', filter: 'agNumberColumnFilter' },
    { field: 'p3_status_code', filter: 'agNumberColumnFilter' },
    { field: 'p4_status_code', filter: 'agNumberColumnFilter' },
    { field: 'p5_status_code', filter: 'agNumberColumnFilter' },
    { field: 'p6_status_code', filter: 'agNumberColumnFilter' },
    { field: 'boost_voltage_v', filter: 'agNumberColumnFilter' },
    { field: 'box_status_code', filter: 'agNumberColumnFilter' },
  ],
  defaultColDef: {
    sortable: true,
    filter: true,
  },
  datasource: datasource,
};

const gridDiv = document.querySelector('#myGrid');
agGrid.createGrid(gridDiv, gridOptions);
