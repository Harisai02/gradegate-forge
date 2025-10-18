import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, name, "student");

    if (!error) {
      navigate("/login");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <CardDescription className="mt-2">
              Join our learning management system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">NAME</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email ID</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Note: All new accounts are created as <strong>students</strong> by default for security. 
                Contact an administrator to upgrade to a teacher account.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Creating..." : "REGISTER"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/login")}
              >
                BACK TO LOGIN
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
