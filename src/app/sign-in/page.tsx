import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review Room</h1>
        <p className="mt-2 text-sm text-zinc-400">Admin sign in</p>
      </div>
      <SignInForm />
    </div>
  );
}
