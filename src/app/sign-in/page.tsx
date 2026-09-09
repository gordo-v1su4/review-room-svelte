import Image from "next/image";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-8 px-4 py-10 sm:px-6">
      <h1 className="sr-only">Review Room</h1>
      <Image
        src="/logo-rr-light.png"
        alt=""
        width={264}
        height={160}
        priority
        className="mx-auto h-32 w-auto opacity-80 sm:h-36"
      />
      <SignInForm />
    </div>
  );
}
