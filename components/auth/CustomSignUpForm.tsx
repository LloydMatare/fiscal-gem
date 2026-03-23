"use client";

import * as React from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

export function CustomSignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  // Handle submission of the sign-up form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      setIsLoading(true);
      await signUp.create({
        emailAddress,
        password,
        firstName: fullName.split(" ")[0],
        lastName: fullName.split(" ").slice(1).join(" "),
      });

      // Send the email.
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Change the UI to our pending section.
      setIsLoading(false);
      setPendingVerification(true);
    } catch (err: any) {
      setIsLoading(false);
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Something went wrong");
    }
  };

  // Handle the submission of the verification form
  const onPressVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      setIsLoading(true);
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (completeSignUp.status !== "complete") {
        /*  investigate the response, to see if there was an error
         or if the user needs to complete more steps */
        console.log(JSON.stringify(completeSignUp, null, 2));
      }
      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        setIsLoading(false);
        router.push("/");
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Invalid verification code");
    }
  };

  const handleSocialSignUp = (strategy: string) => {
    if (!isLoaded || isLoading) return;
    setIsLoading(true);
    signUp.authenticateWithRedirect({
      strategy: strategy as any,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  if (pendingVerification) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-2xl font-semibold tracking-tight">Verify your email</h2>
          <p className="text-gray-500 text-sm">We've sent a code to {emailAddress}</p>
        </div>
        <form onSubmit={onPressVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Verification Code</Label>
            <Input
              id="code"
              value={code}
              placeholder="Enter 6-digit code"
              onChange={(e) => setCode(e.target.value)}
              className="h-14 rounded-2xl bg-gray-50 border-none px-5 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-[#FFD666]/50 transition-all"
            />
          </div>
          {error && <p className="text-red-500 text-xs ml-1">{error}</p>}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 rounded-2xl bg-[#FFD666] hover:bg-[#FFC107] text-gray-900 font-bold shadow-lg shadow-yellow-200/50 transition-all"
          >
            {isLoading ? "Verifying..." : "Verify Email"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center md:text-left space-y-1">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">Create an account</h2>
        <p className="text-gray-500 text-sm">Sign up to access your FDMS portal</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Amélie Laurent"
            required
            className="h-14 rounded-2xl bg-gray-50 border-none px-5 text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-[#FFD666]/50 transition-all"
          />
        </div>

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
          {isLoading ? "Submitting..." : "Submit"}
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleSocialSignUp('oauth_apple')}
          className="h-14 cursor-pointer rounded-2xl border-gray-100 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-all"
        >
          <FaApple size={20} className="mr-2" />
          Apple
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleSocialSignUp('oauth_google')}
          className="h-14 cursor-pointer rounded-2xl border-gray-100 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-all"
        >
          <FcGoogle size={20} className="mr-2" />
          Google
        </Button>
      </div>
    </div>
  );
}
