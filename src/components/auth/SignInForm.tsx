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

type AuthFlow = "signIn" | "signUp" | "reset" | "resetVerification";

function authErrorMessage(err: unknown, flow: AuthFlow) {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("Password reset email is not configured")) {
    return "Password reset email is not configured yet.";
  }
  if (
    message.includes("Could not send password reset email") ||
    message.includes("Resend error")
  ) {
    return "Could not send a reset code. Try again in a moment.";
  }
  if (
    message.includes("Invalid code") ||
    message.includes("Could not verify code")
  ) {
    return "That reset code is invalid or expired.";
  }
  if (message.includes("TooManyFailedAttempts")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
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
    if (flow === "reset" || flow === "resetVerification") {
      return "No password account was found for that email.";
    }
    return flow === "signIn"
      ? "No account found for that email yet. Create an account first."
      : "Could not create that account. Try a different email or password.";
  }
  if (flow === "reset") return message || "Could not send a reset code";
  if (flow === "resetVerification") {
    return message || "Could not reset the password";
  }
  return message ||
    (flow === "signIn" ? "Sign in failed" : "Create account failed");
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
  const [resetStep, setResetStep] = useState<
    null | "request" | { email: string }
  >(null);

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

  async function onResetRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    formData.set("email", email);
    formData.set("flow", "reset");
    setLoading(true);
    setAuthNotice(null);
    try {
      await signIn("password", formData);
      setResetStep({ email });
      setAuthNotice("We sent an 8-digit reset code. It expires in 10 minutes.");
    } catch (err) {
      const message = authErrorMessage(err, "reset");
      setAuthNotice(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function onResetVerification(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resetStep || resetStep === "request") return;
    const formData = new FormData(e.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      const message = "The new passwords do not match.";
      setAuthNotice(message);
      toast.error(message);
      return;
    }

    formData.delete("confirmPassword");
    formData.set("email", resetStep.email);
    formData.set("flow", "reset-verification");
    setLoading(true);
    setAuthNotice(null);
    try {
      await signIn("password", formData);
      toast.success("Password reset. Signing you in…");
    } catch (err) {
      const message = authErrorMessage(err, "resetVerification");
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
  const showPasswordReset = oauthProviders?.passwordReset ?? false;
  const hasOAuth = showGithub || showGoogle;

  if (resetStep) {
    const verifying = resetStep !== "request";
    return (
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setResetStep(null);
              setAuthNotice(null);
              setShowPassword(false);
            }}
            className="text-sm text-zinc-400 transition hover:text-teal-300"
          >
            ← Back to sign in
          </button>
          <h1 className="text-xl font-medium text-zinc-50">Reset password</h1>
          <p className="text-sm leading-6 text-zinc-400">
            {verifying
              ? `Enter the code sent to ${resetStep.email}.`
              : "Enter the email address for your password account."}
          </p>
        </div>

        {authNotice && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {authNotice}
          </div>
        )}

        {verifying ? (
          <form onSubmit={onResetVerification} className="space-y-4">
            <Input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={8}
              placeholder="8-digit code"
              required
              autoFocus
              className="caret-teal-400 text-teal-200/80 focus-visible:ring-teal-500/35"
            />
            <div className="relative">
              <Input
                name="newPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                placeholder="New password"
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
            <Input
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              placeholder="Confirm new password"
              required
              className="caret-teal-400 text-teal-200/80 focus-visible:ring-teal-500/35"
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading || isLoading}
            >
              {loading ? "…" : "Reset password"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setResetStep("request");
                setAuthNotice(null);
              }}
              className="w-full text-center text-sm text-zinc-400 transition hover:text-teal-300"
            >
              Send a new code
            </button>
          </form>
        ) : (
          <form onSubmit={onResetRequest} className="space-y-4">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              required
              autoFocus
              className="caret-teal-400 text-teal-200/80 focus-visible:ring-teal-500/35"
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading || isLoading}
            >
              {loading ? "…" : "Send reset code"}
            </Button>
          </form>
        )}
      </div>
    );
  }

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
          autoComplete="email"
          placeholder="Email"
          required
          className="caret-teal-400 text-teal-200/80 focus-visible:ring-teal-500/35"
        />
        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            minLength={8}
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
        {flow === "signIn" && showPasswordReset && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setResetStep("request");
                setAuthNotice(null);
                setShowPassword(false);
              }}
              className="text-sm text-zinc-400 transition hover:text-teal-300"
            >
              Forgot password?
            </button>
          </div>
        )}
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
