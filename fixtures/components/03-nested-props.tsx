/**
 * Fixture: 03-nested-props.tsx
 * Exercises: complex/generic prop types -> fallbackFields (raw JSON editor)
 * Expected status: PARTIAL (per Error Handling Spec §3.1 — complex prop types
 * alone are enough to move status off FULL)
 */

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T]) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
}: DataTableProps<T>) {
  return (
    <table className="convat-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={String(col.key)}>{String(row[col.key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
