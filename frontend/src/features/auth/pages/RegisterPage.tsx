import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import { useAuth } from '../AuthContext';
import { AuthLayout } from '../AuthLayout';
import { registerSchema, type RegisterForm } from '../schemas';

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signUp(values);
      toast.success('Account created. Welcome to CareerTrack!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      // Show server validation messages under the matching fields; otherwise a toast (e.g. email already taken).
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Registration failed'));
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      description="Start tracking your job applications."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
