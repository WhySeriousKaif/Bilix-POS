# Branch Manager Reports Page — Interview Notes

## Purpose

Reports is an export center. It does not render a live chart; it lets the manager export sales, daily sales, inventory, employee, customer, and refund datasets as CSV or formatted PDF.

## Report cards

The `reports` array defines report metadata: ID, title, icon, color, and description. React maps over it to create identical cards and passes the ID to the export handlers. This avoids duplicating six nearly identical blocks of JSX.

## Export flow

```jsx
const profile = await userAPI.getProfile();
const branchId = profile?.branchId || 1;
```

Every export first identifies the branch, then calls the API appropriate to the selected report:

| Report | Data API |
|---|---|
| Sales | `orderAPI.getByBranch(branchId)` |
| Daily | `orderAPI.getTodayByBranch(branchId)` |
| Inventory | `inventoryAPI.getByBranch(branchId)` |
| Employee | `userAPI.getAll()` |
| Customer | `customerAPI.getAll()` |
| Refund | `refundAPI.getByBranch(branchId)` |

PDF export uses the same data but passes it to `reportPdfGenerator` functions. CSV export converts the response into rows.

## CSV generation

```jsx
const downloadCSV = (filename, headers, rows) => {
  const csv = 'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  const link = document.createElement('a');
  link.href = encodeURI(csv);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

The browser creates a data URI and downloads it; there is no separate export API. The report request is made first so the file contains current backend data.

## Loading state and errors

`downloading` stores values such as `sales_csv` or `inventory_pdf`. The matching card button becomes disabled and changes to “Exporting...” while the request/file generation is running. A success or error toast communicates the result, and `finally` clears the loading state.

## Interview questions

### Is the report data static?

No. Each export fetches the latest branch data before generating the file.

### Why use one handler for many report types?

The shared workflow—set loading, fetch profile, fetch data, generate file, toast, clear loading—is common. The `type` switch changes only the endpoint and columns.

### What should improve in production?

Escape CSV values containing commas/quotes/newlines, filter employees/customers by branch, add server-side export for large datasets, and use a job/download URL when PDF generation is expensive.
