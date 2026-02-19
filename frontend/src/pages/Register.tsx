import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { handleApiError } from '@/lib/api';
import { BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await register({ name, email, password });
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
          <h1 className="text-2xl mt-6">Create account</h1>
          <p className="text-sm font-sans-alt text-[#3b3a37] dark:text-[#b9b3aa] mt-2">
            Start a new workspace for your assignments.
          </p>
        </div>

        <div className="border border-[#1c1b19] dark:border-[#2a2a2a] rounded-3xl p-8 bg-white/80 dark:bg-[#121212] shadow-warm">
          <div className="flex items-center justify-between text-xs font-mono-alt">
            <span>NEW ACCOUNT</span>
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

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
                autoComplete="new-password"
                minLength={8}
              />
              <p className="text-[10px] text-[#3b3a37] dark:text-[#b9b3aa] flex items-center gap-1 font-mono-alt">
                <CheckCircle2 className="h-3 w-3" />
                Use at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm font-sans-alt text-[#3b3a37] dark:text-[#b9b3aa]">
            Already have an account?{' '}
            <Link to="/login" className="font-mono-alt underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
