"use client";

import * as React from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

export function CustomSignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      setIsLoading(true);
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setIsLoading(false);
        router.push("/");
      } else {
        /* investigate the response, to see if there was an error
         or if the user needs to complete more steps */
        console.log(result);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Invalid email or password");
    }
  };

  const handleSocialSignIn = (strategy: string) => {
    if (!isLoaded || isLoading) return;
    setIsLoading(true);
    signIn.authenticateWithRedirect({
      strategy: strategy as any,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center md:text-left space-y-1">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">Sign in</h2>
        <p className="text-gray-500 text-sm">Welcome back to your FDMS portal</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</Label>
          <Input
            id="email"
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="amelielaurent7622@gmail.com"
            required
            className="h-14 rounded-2xl bg-gray-50 border-none px-5 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-[#FFD666]/50 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              required
              className="h-14 rounded-2xl bg-gray-50 border-none px-5 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-[#FFD666]/50 transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs ml-1">{error}</p>}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 rounded-2xl bg-[#FFD666] hover:bg-[#FFC107] text-gray-900 font-bold text-base shadow-lg shadow-yellow-200/50 transition-all hover:scale-[1.01] active:scale-[0.99] mt-2"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleSocialSignIn('oauth_apple')}
          className="h-14 cursor-pointer rounded-2xl border-gray-100 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-all"
        >
          <FaApple size={20} className="mr-2" />
          Apple
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleSocialSignIn('oauth_google')}
          className="h-14 cursor-pointer rounded-2xl border-gray-100 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-all"
        >
          <FcGoogle size={20} className="mr-2" />
          Google
        </Button>
      </div>
    </div>
  );
}
