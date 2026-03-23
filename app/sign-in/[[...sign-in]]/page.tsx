import { AuthLayout } from "@/components/auth/AuthLayout";
import { CustomSignInForm } from "@/components/auth/CustomSignInForm";

export default function SignInPage() {
  return (
    <AuthLayout isSignUp={false}>
      <CustomSignInForm />
    </AuthLayout>
  );
}
