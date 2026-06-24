"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Github } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function authErrorMessage(err: unknown, flow: "signIn" | "signUp") {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("Account") && message.includes("already exists")) {
    return "That account already exists. Switch to Sign in.";
  }
  if (message.includes("InvalidSecret")) {
    return flow === "signIn"
      ? "That password does not match this account."
      : "Use a password with at least 8 characters.";
  }
  if (message.includes("Invalid password")) {
    return "Use a password with at least 8 characters.";
  }
  if (
    message.includes("InvalidAccountId") ||
    message.includes("Invalid credentials")
  ) {
    return flow === "signIn"
      ? "No account found for that email yet. Create an account first."
      : "Could not create that account. Try a different email or password.";
  }
  return message || (flow === "signIn" ? "Sign in failed" : "Create account failed");
}

function accessDeniedMessage() {
  return "That login is not authorized for this workspace.";
}

export function SignInForm() {
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureAppProfile = useMutation(api.auth.ensureAppProfile);
  const oauthProviders = useQuery(api.auth.oauthProviders);
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);
  const [pendingName, setPendingName] = useState<string | undefined>();
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setAuthNotice(accessDeniedMessage());
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    void ensureAppProfile({ name: pendingName })
      .then(() => router.replace("/dashboard"))
      .catch(() => {
        const message = accessDeniedMessage();
        setAuthNotice(message);
        toast.error(message);
        void signOut().finally(() => setLoading(false));
      });
  }, [isAuthenticated, isLoading, ensureAppProfile, pendingName, router, signOut]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("flow", flow);
    setLoading(true);
    setAuthNotice(null);
    try {
      const name = (formData.get("name") as string) || undefined;
      setPendingName(name);
      await signIn("password", formData);
      setLoading(false);
    } catch (err) {
      const message = authErrorMessage(err, flow);
      if (message.includes("already exists")) {
        setFlow("signIn");
      }
      setAuthNotice(message);
      toast.error(message);
      setLoading(false);
    }
  }

  function handleOAuth(provider: "google" | "github", label: string) {
    setLoading(true);
    setAuthNotice(null);
    void signIn(provider).catch((err) => {
      toast.error(
        err instanceof Error ? err.message : `${label} sign-in failed`,
      );
      setLoading(false);
    });
  }

  const showGithub = oauthProviders?.github ?? false;
  const showGoogle = oauthProviders?.google ?? false;
  const hasOAuth = showGithub || showGoogle;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
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

      {authNotice && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {authNotice}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {flow === "signUp" && (
          <Input
            name="name"
            placeholder="Your name"
            className="caret-teal-400 text-teal-200/80 focus-visible:ring-teal-500/35"
          />
        )}
        <Input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="caret-teal-400 text-teal-200/80 focus-visible:ring-teal-500/35"
        />
        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            className="pr-10 caret-teal-400 text-teal-200/80 focus-visible:ring-teal-500/35"
          />
          <button
            type="button"
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-teal-300/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-400/50"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <Button type="submit" className="w-full" disabled={loading || isLoading}>
          {loading ? "…" : flow === "signIn" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {hasOAuth && (
        <>
          <div className="relative text-center text-xs text-zinc-500">
            <span className="relative z-10 bg-[var(--background)] px-2">
              Or continue with
            </span>
            <div className="absolute inset-x-0 top-1/2 border-t border-zinc-800" />
          </div>

          <div className="grid gap-2">
            {showGithub && (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                disabled={loading || isLoading}
                onClick={() => handleOAuth("github", "GitHub")}
              >
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            )}
            {showGoogle && (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                disabled={loading || isLoading}
                onClick={() => handleOAuth("google", "Google")}
              >
                <span className="grid h-4 w-4 place-items-center text-sm font-semibold leading-none text-zinc-50">
                  G
                </span>
                Google
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
