import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { completeLogin, getAuthReturnPath } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallbackPage });

function AuthCallbackPage() {
  const [status, setStatus] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Securing your Canton session...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error_description") || params.get("error");
    const code = params.get("code");
    const state = params.get("state");

    if (providerError || !code || !state) {
      setStatus("error");
      setMessage(providerError || "The login response was incomplete. Please try again.");
      return;
    }

    completeLogin(code, state)
      .then(() => {
        setStatus("success");
        setMessage("Connected. Loading your Canton workspace...");
        window.setTimeout(() => window.location.replace(getAuthReturnPath()), 450);
      })
      .catch((cause) => {
        setStatus("error");
        setMessage(cause instanceof Error ? cause.message : "Canton sign-in failed");
      });
  }, []);

  return (
    <main className="auth-callback-page">
      <section className={`auth-callback-card ${status}`}>
        <img src="/damllens-logo-v2.png" alt="" />
        <span className="eyebrow">Canton connection</span>
        {status === "working" && <Loader2 className="spin" />}
        {status === "success" && <CheckCircle2 />}
        {status === "error" && <AlertCircle />}
        <h1>{status === "error" ? "Connection interrupted" : "Connecting DamlLens"}</h1>
        <p>{message}</p>
        {status === "error" && (
          <a className="button primary" href="/app/analyze">
            Return to connection
          </a>
        )}
      </section>
    </main>
  );
}
