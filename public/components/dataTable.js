// public/js/components/table.js
export function createTable(el, data) {
  return webix.ui({
    container: el,
    view: "datatable",
    columns: [
      { id:"id", header:"ID" },
      { id:"name", header:"Name" }
    ],
    data: data || []
  });
} 