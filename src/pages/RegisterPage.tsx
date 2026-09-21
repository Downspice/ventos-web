import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { REGISTER } from "../lib/apollo";
import { setTokens } from "../lib/auth-storage";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, { loading, error }] = useMutation(REGISTER);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await register({
      variables: { input: { businessName, name, email, password } },
    });
    const payload = (data as { register?: { accessToken: string; refreshToken: string } } | undefined)?.register;
    if (payload?.accessToken) {
      setTokens(payload.accessToken, payload.refreshToken);
      navigate("/");
    }
  }

  return (
    <div
      className="flex min-h-svh items-center justify-center px-4 py-12"
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
              Create your business
            </h1>
            <p className="mt-1 text-sm" style={{ color: "oklch(0.52 0.015 250)" }}>
              Get started with Ventos in minutes.
            </p>
          </div>
        </div>

        <Card className="rounded bg-white p-2 shadow-sm ring-1 ring-foreground/10">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="register-business-name">Business name</Label>
                <Input
                  id="register-business-name"
                  className="h-10"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Corp"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="register-name">Your name</Label>
                <Input
                  id="register-name"
                  className="h-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="register-email">Email address</Label>
                <Input
                  id="register-email"
                  className="h-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="register-password">Password</Label>
                <PasswordInput
                  id="register-password"
                  className="h-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
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

              <Button id="register-submit" type="submit" disabled={loading} className="h-10 w-full">
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.52 0.015 250)" }}>
          Already registered?{" "}
          <Link
            to="/login"
            className="font-medium"
            style={{ color: "oklch(0.52 0.175 241)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
