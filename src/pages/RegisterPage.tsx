import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthError, AuthLayout } from "@/components/AuthLayout";
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
    <AuthLayout
      title="Create your business"
      description="Get started with Ventos in minutes."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
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

        {error ? <AuthError message={error.message} /> : null}

        <Button id="register-submit" type="submit" disabled={loading} className="h-10 w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
