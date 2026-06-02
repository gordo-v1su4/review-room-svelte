"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Github, Globe } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureAdmin = useMutation(api.auth.ensureAdminProfile);
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    void ensureAdmin({})
      .then(() => router.replace("/dashboard"))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not finish sign-in");
      });
  }, [isAuthenticated, isLoading, ensureAdmin, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("flow", flow);
    setLoading(true);
    try {
      await signIn("password", formData);
      const name = (formData.get("name") as string) || undefined;
      await ensureAdmin({ name });
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  function handleOAuth(provider: "google" | "github", label: string) {
    setLoading(true);
    void signIn(provider).catch((err) => {
      toast.error(
        err instanceof Error ? err.message : `${label} sign-in failed`,
      );
      setLoading(false);
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="flex gap-2 rounded-lg bg-zinc-900 p-1">
        {(["signIn", "signUp"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFlow(id)}
            className={`flex-1 rounded-md py-1.5 text-sm ${
              flow === id
                ? "bg-zinc-800 text-zinc-50"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {id === "signIn" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {flow === "signUp" && (
          <Input name="name" placeholder="Your name" />
        )}
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="password" type="password" placeholder="Password" required />
        <Button type="submit" className="w-full" disabled={loading || isLoading}>
          {loading ? "…" : flow === "signIn" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="relative text-center text-xs text-zinc-500">
        <span className="bg-[var(--background)] px-2 relative z-10">
          Or continue with
        </span>
        <div className="absolute inset-x-0 top-1/2 border-t border-zinc-800" />
      </div>

      <div className="grid gap-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={loading || isLoading}
          onClick={() => handleOAuth("github", "GitHub")}
        >
          <Github className="mr-2 h-4 w-4" />
          GitHub
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={loading || isLoading}
          onClick={() => handleOAuth("google", "Google")}
        >
          <Globe className="mr-2 h-4 w-4" />
          Google
        </Button>
      </div>
    </div>
  );
}
