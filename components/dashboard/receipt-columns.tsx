"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { format } from "date-fns"
import { CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react"

export type ReceiptColumn = {
  id: string
  receiptNo: string | null
  currency: string | null
  total: number | null
  status: string | null
  submittedAt: Date | null
  createdAt: Date
  deviceSerial: string | null
  qrUrl: string | null
}

export const receiptColumns: ColumnDef<ReceiptColumn>[] = [
  {
    accessorKey: "receiptNo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Receipt #" />
    ),
    cell: ({ row }) => (
      <span className="font-extrabold text-[#1e1a17]">#{row.getValue("receiptNo")}</span>
    ),
  },
  {
    accessorKey: "deviceSerial",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Device" />
    ),
    cell: ({ row }) => (
      <span className="text-[10px] font-bold text-[#6a5f57] uppercase tracking-widest opacity-60">
        {row.getValue("deviceSerial")}
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
      if (status === 'submitted' || status === 'accepted') {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            {status}
          </span>
        )
      }
      if (status === 'pending') {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-[10px] font-black uppercase text-yellow-700">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      }
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase text-red-700">
          <XCircle className="h-3 w-3" />
          {status}
        </span>
      )
    },
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => {
      const amount = Number(row.getValue("total") || 0) / 100
      const currency = row.original.currency
      return (
        <div className="font-black text-[#1e1a17]">
          <span className="text-[10px] opacity-30 mr-1">{currency}</span>
          {amount.toLocaleString()}
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.submittedAt || row.original.createdAt)
      return (
        <span className="text-[10px] font-bold text-[#6a5f57] opacity-60 capitalize">
          {format(date, 'MMM d, HH:mm')}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const qrUrl = row.original.qrUrl
      if (!qrUrl) return null
      return (
        <div className="text-right">
          <a 
            href={qrUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#f6f2ea] transition-all hover:bg-[#fbbf24] hover:shadow-inner"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )
    },
  },
]
