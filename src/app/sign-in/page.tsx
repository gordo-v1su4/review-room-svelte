import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-xl flex-col justify-center gap-8 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Review Room</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to your review workspace</p>
      </div>
      <SignInForm />
    </div>
  );
}
