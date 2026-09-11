import { SignInForm } from "@/components/auth/SignInForm";
import { SignInLogo } from "@/components/auth/SignInLogo";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-10 sm:px-6">
      <div aria-hidden className="rr-blueprint pointer-events-none absolute inset-0 z-0" />
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(46rem 26rem at 50% -10rem, rgb(94 196 180 / 0.07), transparent 65%)",
        }}
      />

      {/* Technical framing */}
      <div aria-hidden className="pointer-events-none absolute left-5 top-5 font-mono text-[10px] tracking-[0.22em] text-zinc-600 uppercase sm:left-8 sm:top-8">
        RR / Access Control
      </div>
      <div aria-hidden className="pointer-events-none absolute right-5 top-5 font-mono text-[10px] tracking-[0.22em] text-zinc-600 uppercase sm:right-8 sm:top-8">
        SYS.01
      </div>
      <div aria-hidden className="pointer-events-none absolute bottom-5 left-5 font-mono text-[10px] tracking-[0.22em] text-zinc-600 uppercase sm:bottom-8 sm:left-8">
        Uplink secure
      </div>
      <div aria-hidden className="pointer-events-none absolute bottom-5 right-5 font-mono text-[10px] tracking-[0.22em] text-zinc-600 uppercase sm:bottom-8 sm:right-8">
        v0.1.0
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-9">
        <h1 className="sr-only">Review Room</h1>
        <div className="flex flex-col items-center gap-4">
          <SignInLogo />
          <p className="rr-eyebrow" style={{ color: "var(--brand-accent)" }}>
            Client media review
          </p>
        </div>
        <SignInForm />
        <p className="text-center font-mono text-[10px] tracking-[0.18em] text-zinc-600 uppercase">
          Secure access for clients and collaborators
        </p>
      </div>
    </div>
  );
}
