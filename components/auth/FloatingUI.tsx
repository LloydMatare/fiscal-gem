"use client";

import { cn } from "@/lib/utils";

interface SalesSummaryCardProps {
  title: string;
  currency: string;
  amount: string;
  transactions: number;
  className?: string;
  variant?: "yellow" | "glass" | "white";
}

function SalesSummaryCard({ 
  title, 
  currency, 
  amount, 
  transactions, 
  className,
  variant = "glass" 
}: SalesSummaryCardProps) {
  return (
    <div className={cn(
      "p-5 rounded-[1.5rem] shadow-xl backdrop-blur-md border border-white/20 transition-all duration-700 animate-in fade-in zoom-in-95",
      variant === "yellow" && "bg-[#FFD666]/90 border-[#FFD666]/20",
      variant === "glass" && "bg-white/40 border-white/30",
      variant === "white" && "bg-white/90 border-white/10",
      className
    )}>
      <h3 className={cn(
        "text-sm font-semibold mb-3",
        variant === "yellow" ? "text-gray-900" : "text-gray-800"
      )}>
        {title}
      </h3>
      <div className="space-y-1">
        <p className={cn(
          "text-[10px] uppercase font-bold tracking-wider",
          variant === "yellow" ? "text-gray-800/60" : "text-gray-500"
        )}>
          {currency}
        </p>
        <p className={cn(
          "text-2xl font-bold tracking-tight",
          variant === "yellow" ? "text-gray-900" : "text-gray-900"
        )}>
          {amount}
        </p>
      </div>
      <p className={cn(
        "mt-3 text-[10px] font-medium",
        variant === "yellow" ? "text-gray-800/60" : "text-gray-400"
      )}>
        {transactions} Transactions
      </p>
    </div>
  );
}

export function FloatingUI() {
  return (
    <div className="relative h-full w-full">
      {/* Sales Summary Card 1 (Yellow) */}
      <div className="absolute top-[10%] left-[5%] z-20 w-64 animate-in fade-in slide-in-from-top-8 duration-1000">
        <SalesSummaryCard 
          title="Sales Summary"
          currency="USD"
          amount="$1238.00"
          transactions={26}
          variant="yellow"
        />
        {/* Shadow for depth */}
        <div className="mt-2 ml-4 h-12 w-56 rounded-2xl bg-black/5 blur-xl" />
      </div>

      {/* Sales Summary Card 2 (Glass - Z$) */}
      <div className="absolute top-[40%] left-[10%] z-10 w-56 animate-in fade-in slide-in-from-left-8 duration-1000 delay-200">
        <SalesSummaryCard 
          title="Sales Summary"
          currency="ZWL"
          amount="Z$875,000.00"
          transactions={123}
          variant="glass"
          className="bg-blue-50/30 backdrop-blur-xl"
        />
      </div>

      {/* Sales Summary Card 3 (White/Glass - USD) */}
      <div className="absolute top-[45%] right-[5%] z-30 w-56 animate-in fade-in slide-in-from-right-8 duration-1000 delay-500">
        <SalesSummaryCard 
          title="Sales Summary"
          currency="USD"
          amount="$130.25"
          transactions={19}
          variant="glass"
          className="bg-white/60"
        />
      </div>

      {/* Sales Summary Card 4 (Glass - Z$ Large) */}
      <div className="absolute bottom-[10%] left-[25%] z-20 w-64 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
        <SalesSummaryCard 
          title="Sales Summary"
          currency="USD"
          amount="$1238.00" // Note: mockup shows this data again or similar
          transactions={26}
          variant="glass"
        />
      </div>

      {/* ZIMRA Logo in top right of the right panel */}
      <div className="absolute top-8 right-8 h-16 w-16 opacity-80 transition-opacity hover:opacity-100 animate-in fade-in duration-1000 delay-1000">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 p-2 backdrop-blur-md border border-white/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white/40">ZIMRA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
