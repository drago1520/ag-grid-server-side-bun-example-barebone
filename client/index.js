const gridOptions = {
  rowModelType: "serverSide",
  columnDefs: [
    { field: "athlete" },
    { field: "country", filter: "agTextColumnFilter" },
    { field: "sport" },
    { field: "year", filter: "agNumberColumnFilter", filterParams: { newRowsAction: "keep" } },
    { field: "gold" },
    { field: "silver" },
    { field: "bronze" },
  ],
  defaultColDef: {
    sortable: true,
  },
};

const gridDiv = document.querySelector("#myGrid");
const gridApi = agGrid.createGrid(gridDiv, gridOptions);

const datasource = {
  getRows(params) {
    console.log(JSON.stringify(params.request, null, 1));

    fetch("/olympicWinners", {
      method: "POST",
      body: JSON.stringify(params.request),
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
      .then((httpResponse) => httpResponse.json())
      .then((response) => {
        params.success({
          rowData: response.rows,
          rowCount: response.lastRow,
        });
      })
      .catch((error) => {
        console.error(error);
        params.fail();
      });
  },
};

gridApi.setGridOption("serverSideDatasource", datasource);
