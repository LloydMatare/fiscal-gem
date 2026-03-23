"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { FiscalDayControls } from "./FiscalDayControls"

export type DeviceColumn = {
  id: string
  serialNumber: string | null
  deviceId: number | null
  branchName: string | null
  status: string | null
  currentDayStatus: "open" | "closed"
  lastDayNo: number | null
}

export const deviceColumns: ColumnDef<DeviceColumn>[] = [
  {
    accessorKey: "serialNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Device" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-extrabold text-[#1e1a17]">{row.getValue("serialNumber") || "No Serial"}</span>
        <span className="text-[10px] font-bold text-[#6a5f57] opacity-60">ID: {row.original.deviceId || "N/A"}</span>
      </div>
    ),
  },
  {
    accessorKey: "branchName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Branch" />
    ),
    cell: ({ row }) => (
      <span className="text-xs font-bold text-[#463f3a]">{row.getValue("branchName") || "Default Branch"}</span>
    ),
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
            ${status === 'active' ? 'bg-green-100 text-green-700' : 
              status === 'registered' ? 'bg-blue-100 text-blue-700' : 
              'bg-gray-100 text-gray-700'}`}
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "currentDayStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fiscal Day" />
    ),
    cell: ({ row }) => {
      const status = row.original.currentDayStatus
      const dayNo = row.original.lastDayNo
      return (
        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter
          ${status === 'open' ? 'text-green-600' : 'text-red-500'}`}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${status === 'open' ? 'bg-green-600 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
          Day {dayNo || "N/A"} ({status})
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="text-right">
        <FiscalDayControls 
          deviceId={row.original.id} 
          currentDayStatus={row.original.currentDayStatus} 
        />
      </div>
    ),
  },
]
