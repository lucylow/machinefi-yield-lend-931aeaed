import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, empty, className }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">{empty ?? "No rows."}</div>;
  }

  return (
    <div className={cn("rounded-xl border border-border/60 overflow-hidden bg-card/40", className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            {columns.map((c) => (
              <TableHead key={c.key} className={cn("text-[11px] uppercase tracking-wide text-muted-foreground", c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)} className="border-border/50">
              {columns.map((c) => (
                <TableCell key={c.key} className={cn("text-sm", c.className)}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
