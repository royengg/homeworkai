import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { handleApiError } from '@/lib/api';
import { BookOpen, AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f7f3ee] dark:bg-[#0b0b0b] text-[#1c1b19] dark:text-[#f7f3ee] font-editorial relative overflow-hidden flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-paper opacity-60 dark:opacity-0 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" className="flex items-center gap-3 text-[#1c1b19] dark:text-[#f7f3ee]">
            <div className="w-11 h-11 rounded-full border border-[#1c1b19] dark:border-[#2a2a2a] grid place-items-center text-sm font-mono-alt">
              HW
            </div>
            <div className="text-sm tracking-[0.2em] uppercase font-mono-alt">HomeworkAI</div>
          </Link>
          <h1 className="text-2xl mt-6">Sign in</h1>
          <p className="text-sm font-sans-alt text-[#3b3a37] dark:text-[#b9b3aa] mt-2">
            Access your workspace and recent uploads.
          </p>
        </div>

        <div className="border border-[#1c1b19] dark:border-[#2a2a2a] rounded-3xl p-8 bg-white/80 dark:bg-[#121212] shadow-warm">
          <div className="flex items-center justify-between text-xs font-mono-alt">
            <span>ACCOUNT ACCESS</span>
            <BookOpen className="h-4 w-4" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-md border border-red-200 dark:border-red-900">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm font-sans-alt text-[#3b3a37] dark:text-[#b9b3aa]">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-mono-alt underline underline-offset-4">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
