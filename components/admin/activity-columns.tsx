"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { format } from "date-fns"
import { Receipt, Building2 } from "lucide-react"

export type ActivityColumn = {
  id: string
  receiptNo: string | null
  organization: string | null
  total: number | null
  status: string | null
  createdAt: Date
}

export const activityColumns: ColumnDef<ActivityColumn>[] = [
  {
    accessorKey: "receiptNo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fbbf24]/10 text-[#fbbf24]">
          <Receipt size={14} />
        </div>
        <span className="font-extrabold text-[#1e1a17]">#{row.getValue("receiptNo")}</span>
      </div>
    ),
  },
  {
    accessorKey: "organization",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Building2 size={12} className="text-[#6a5f57] opacity-60" />
        <span className="text-xs font-black text-[#463f3a]">{row.getValue("organization")}</span>
      </div>
    ),
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => {
      const amount = Number(row.getValue("total") || 0) / 100
      return (
        <span className="font-black text-[#1e1a17]">
          ${amount.toLocaleString()}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge 
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter border-none
            ${status === 'submitted' || status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Time" />
    ),
    cell: ({ row }) => (
      <span className="text-[10px] font-bold text-[#6a5f57] opacity-60">
        {format(new Date(row.getValue("createdAt")), 'HH:mm • MMM d')}
      </span>
    ),
  },
]
