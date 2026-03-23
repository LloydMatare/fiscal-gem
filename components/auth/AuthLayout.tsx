"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { FloatingUI } from "./FloatingUI";
import { Gem } from "lucide-react";
import Link from "next/link";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  isSignUp?: boolean;
}

export function AuthLayout({ children, title, description, isSignUp = false }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFCF9] p-4 md:p-8">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl md:flex-row relative">
        {/* Left Side: Form */}
        <div className="flex w-full flex-col p-8 md:w-1/2 md:p-12 lg:p-16 relative z-10">
          <div className="mb-10">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Gem size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">FiscalGem</span>
            </div>
          </div>
          
          <div className="flex flex-1 flex-col justify-center max-w-sm mx-auto w-full">
            {title && (
              <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight text-gray-900 md:text-left md:text-3.5xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="mb-8 text-center text-gray-500 md:text-left">
                {description}
              </p>
            )}
            
            {children}
          </div>
          
          <div className="mt-10 flex flex-col items-center justify-between gap-4 text-xs text-gray-400 md:flex-row">
            <div>
              {isSignUp ? (
                <span>Have any account? <Link href="/sign-in" className="font-semibold text-gray-900 underline">Sign in</Link></span>
              ) : (
                <span>Don't have an account? <Link href="/sign-up" className="font-semibold text-gray-900 underline">Sign up</Link></span>
              )}
            </div>
            <a href="#" className="hover:text-gray-600 transition-colors uppercase tracking-widest font-medium">Terms & Conditions</a>
          </div>
        </div>

        {/* Right Side: Visuals */}
        <div className="relative hidden w-1/2 overflow-hidden bg-gray-50 md:block">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
             <Image 
              src="/auth-bg.png"
              alt="Office Collaboration"
              fill
              sizes="50vw"
              className="object-cover opacity-90 transition-opacity duration-700"
              priority
            />
            {/* Soft gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-transparent" />
          </div>
          
          {/* Floating UI Elements */}
          <div className="relative z-10 flex h-full items-center justify-center p-8">
            <FloatingUI />
          </div>

          {/* Close button - UI aesthetic */}
          <button className="absolute top-8 right-8 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow-sm backdrop-blur-sm transition-transform hover:scale-105 z-20">
            <span className="text-xl font-light">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}
