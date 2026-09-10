import { SignInForm } from "@/components/auth/SignInForm";
import { SignInLogo } from "@/components/auth/SignInLogo";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-7 py-10 sm:px-6">
      <h1 className="sr-only">Review Room</h1>
      <SignInLogo />
      <SignInForm />
    </div>
  );
}
