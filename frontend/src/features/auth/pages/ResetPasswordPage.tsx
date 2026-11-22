import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/ui/password-input';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import { tokenStore } from '@/lib/authToken';
import { authApi } from '../auth.api';
import { AuthLayout } from '../AuthLayout';
import { resetPasswordSchema, type ResetPasswordForm } from '../schemas';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = useSearchParams()[0].get('token') ?? '';
  const [linkProblem, setLinkProblem] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    try {
      await authApi.resetPassword({ token, newPassword });
      tokenStore.clear(); // a reset ends every session, including one left open in this browser
      toast.success('Password updated. Please sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      if (applyFieldErrors(error, setError)) return;
      // The server answers 400 "invalid or expired" for used, expired and unknown links.
      if (axios.isAxiosError(error) && error.response?.status === 400) setLinkProblem(true);
      else toast.error(getErrorMessage(error, 'Could not reset the password'));
    }
  });

  const footer = (
    <Link to="/login" className="font-medium text-primary hover:underline">
      Back to sign in
    </Link>
  );

  if (!token || linkProblem) {
    return (
      <AuthLayout title="This link cannot be used" description="It may have expired, or it has already been used." footer={footer}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <TriangleAlert className="h-10 w-10 text-destructive" aria-hidden />
          <p className="text-sm text-muted-foreground">Reset links work once and expire after 60 minutes. Request a new one to continue.</p>
          <Button asChild>
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" description="Pick a password you have not used before." footer={footer}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="New password" htmlFor="newPassword" error={errors.newPassword?.message}>
          <PasswordInput id="newPassword" autoComplete="new-password" autoFocus aria-invalid={!!errors.newPassword} {...register('newPassword')} />
        </FormField>
        <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
        </FormField>
        <p className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
