const datasource = {
  getRows(params) {
    console.log(JSON.stringify(params))

    fetch("http://localhost:4000/olympicWinners", {
      method: "POST",
      body: JSON.stringify(params), //the obj also contains f()
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
      .then((httpResponse) => httpResponse.json())
      .then((response) => {
        console.log('response :', response);
        params.successCallback(response.rows, response.lastRow);
      })
      .catch((error) => {
        console.error(error);
        params.failCallback();
      });
  },
};

const gridOptions = {
  rowModelType: "infinite",
  columnDefs: [
    { field: "athlete" },
    { field: "country", filter: "agTextColumnFilter" },
    { field: "sport" },
    { field: "year", filter: "agNumberColumnFilter", filterParams: { newRowsAction: "keep" } },
    { field: "bigint_value", filter: "agBigIntColumnFilter" },
    {
      field: "created_at",
      filter: "agDateColumnFilter",
      filterParams: {
        filterOptions: ["empty", "equals", "notEqual", "lessThan", "lessThanOrEqual", "greaterThan", "greaterThanOrEqual", "inRange", "blank", "notBlank", "today", "yesterday", "tomorrow", "thisWeek", "lastWeek", "nextWeek", "thisMonth", "lastMonth", "nextMonth", "thisQuarter", "lastQuarter", "nextQuarter", "thisYear", "lastYear", "nextYear", "yearToDate", "last7Days", "last30Days", "last90Days", "last6Months", "last12Months", "last24Months",
        ], //built-in type ISimpleFilterModelPresetType, I need to handle the backend, "empty" => "choose one" in UI
      },
    },
    { field: "gold" },
    { field: "silver" },
    { field: "bronze" },
  ],
  defaultColDef: {
    sortable: true,
  },
  datasource: datasource,
};

const gridDiv = document.querySelector("#myGrid");
const gridApi = agGrid.createGrid(gridDiv, gridOptions);
