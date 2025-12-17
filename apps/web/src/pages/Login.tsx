import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { signIn, useAuth } from "../features/auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader } from "../components/Loader";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { BarChart3 } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#004747] to-[#006666] flex items-center justify-center">
        <Loader text="Loading..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const response = await signIn({ email, password });

    if (response.error) {
      setError(response.error.message || "Failed to sign in");
      setLoading(false);
      return;
    }

    console.log("response: ", response);
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    navigate("/dashboard");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#004747] to-[#006666] flex items-center justify-center p-6 pb-32">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 text-white mb-2">
            <BarChart3 size={40} />
            <h1 className="text-4xl font-bold">Veritas</h1>
          </div>
          <p className="text-white/80">See the truth about your customers</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={loading} />

              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={loading} />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link to="/signup" className="text-[#004747] hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
