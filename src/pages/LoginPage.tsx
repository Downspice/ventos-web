import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LOGIN } from "../lib/apollo";
import { setTokens } from "../lib/auth-storage";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { loading, error }] = useMutation(LOGIN);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await login({ variables: { input: { email, password } } });
    const payload = (data as { login?: { accessToken: string; refreshToken: string } } | undefined)?.login;
    if (payload?.accessToken) {
      setTokens(payload.accessToken, payload.refreshToken);
      navigate("/");
    }
  }

  return (
    <div
      className="flex min-h-svh items-center justify-center px-4"
      style={{ background: "oklch(0.967 0.003 247)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold text-white"
            style={{ background: "oklch(0.568 0.185 142)" }}
          >
            V
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold" style={{ color: "oklch(0.2 0.01 260)" }}>
              Sign in to Ventos
            </h1>
            <p className="mt-1 text-sm" style={{ color: "oklch(0.52 0.015 250)" }}>
              Welcome back. Enter your credentials to continue.
            </p>
          </div>
        </div>

        <Card className="rounded bg-white p-2 shadow-sm ring-1 ring-foreground/10">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="grid gap-5">
              <div className="grid gap-1.5">
                <Label htmlFor="login-email">Email address</Label>
                <Input
                  id="login-email"
                  className="h-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="login-password">Password</Label>
                <PasswordInput
                  id="login-password"
                  className="h-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error ? (
                <p
                  className="rounded px-3 py-2 text-sm"
                  style={{
                    background: "oklch(0.97 0.02 27)",
                    color: "oklch(0.55 0.22 27)",
                    border: "1px solid oklch(0.88 0.08 27)",
                  }}
                >
                  {error.message}
                </p>
              ) : null}

              <Button id="login-submit" type="submit" disabled={loading} className="h-10 w-full">
                {loading ? "Signing in…" : "Sign in"}
              </Button>

              <div className="relative flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <Button
                id="login-google"
                variant="outline"
                className="h-10 w-full"
                render={<a href={`${apiUrl}/auth/google`} />}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.52 0.015 250)" }}>
          New business?{" "}
          <Link
            to="/register"
            className="font-medium"
            style={{ color: "oklch(0.52 0.175 241)" }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
