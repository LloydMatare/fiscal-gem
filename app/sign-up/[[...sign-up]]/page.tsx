import { AuthLayout } from "@/components/auth/AuthLayout";
import { CustomSignUpForm } from "@/components/auth/CustomSignUpForm";

export default function SignUpPage() {
  return (
    <AuthLayout isSignUp={true}>
      <CustomSignUpForm />
    </AuthLayout>
  );
}
