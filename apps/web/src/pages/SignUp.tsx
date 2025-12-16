import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { signUp, signUpSchema, useAuth } from '../features/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader } from '../components/Loader';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { BarChart3 } from 'lucide-react';
import { ZodError } from 'zod';

export function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
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

  function validateField(field: string, value: string) {
    try {
      signUpSchema.pick({ [field]: true } as any).parse({ [field]: value });
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    } catch (err) {
      if (err instanceof ZodError && err.issues.length > 0) {
        setErrors(prev => ({
          ...prev,
          [field]: err.issues[0].message
        }));
      }
    }
  }

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError('');

    try {
      const validatedData = signUpSchema.parse(formData);
      setLoading(true);
      await signUp(validatedData);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setServerError(err instanceof Error ? err.message : 'Failed to sign up');
      }
    } finally {
      setLoading(false);
    }
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
            <CardTitle>Sign Up</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {serverError}
                </div>
              )}

              <Input
                label="Full Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="John Doe"
                error={errors.name}
                required
                disabled={loading}
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com"
                error={errors.email}
                required
                disabled={loading}
              />

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="At least 8 characters"
                error={errors.password}
                required
                disabled={loading}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading || Object.keys(errors).length > 0}
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-[#004747] hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
