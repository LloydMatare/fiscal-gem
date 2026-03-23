"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"

export type FileColumn = {
  name: string
  type: string
  status: string
}

export const fileColumns: ColumnDef<FileColumn>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="File Name" />
    ),
    cell: ({ row }) => <span className="text-sm font-bold text-[#1e1a17]">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <span className="text-[10px] font-black uppercase tracking-widest text-[#6a5f57] opacity-60">
        {row.getValue("type")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const statusStyles: Record<string, string> = {
        pending: "bg-amber-50 text-amber-700",
        submitted: "bg-blue-50 text-blue-700",
        processing: "bg-purple-50 text-purple-700",
        completed: "bg-green-50 text-green-700",
        failed: "bg-red-50 text-red-700",
      }
      const style = statusStyles[status] ?? "bg-gray-50 text-gray-700"
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${style}`}>
          {status}
        </span>
      )
    },
  },
]
