// src/components/DynamicTable.tsx
import React from "react";

export interface Column {
  id: string;
  header: string;
}

export interface Row {
  [key: string]: string;
}

export interface SectionData {
  columns: Column[];
  rows: Row[];
}

export interface DynamicTableProps {
  data: SectionData;
  onChange: (data: SectionData) => void;
  readOnly?: boolean;
}

const DynamicTable: React.FC<DynamicTableProps> = ({
  data,
  onChange,
  readOnly,
}) => {
  const updateCell = (rowIndex: number, columnId: string, value: string) => {
    const newRows = [...data.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [columnId]: value };
    onChange({ ...data, rows: newRows });
  };

  const addRow = () => {
    const emptyRow: Row = {};
    data.columns.forEach((col) => {
      emptyRow[col.id] = "";
    });
    onChange({ ...data, rows: [...data.rows, emptyRow] });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-slate-200 rounded-xl overflow-hidden">
        <thead className="bg-slate-100">
          <tr>
            {data.columns.map((col) => (
              <th
                key={col.id}
                className="px-4 py-2 text-left text-sm font-bold"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="border-t">
              {data.columns.map((col) => (
                <td key={col.id} className="px-4 py-2">
                  <input
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    value={row[col.id] || ""}
                    onChange={(e) => updateCell(i, col.id, e.target.value)}
                    disabled={readOnly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold"
        >
          + Add Row
        </button>
      )}
    </div>
  );
};

export default DynamicTable;
