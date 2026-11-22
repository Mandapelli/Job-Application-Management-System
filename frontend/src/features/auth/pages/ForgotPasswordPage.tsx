import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/apiError';
import { authApi } from '../auth.api';
import { AuthLayout } from '../AuthLayout';
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas';

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await authApi.forgotPassword(email);
      setSentTo(email); // the same screen is shown whether or not the email has an account
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send the reset link'));
    }
  });

  const footer = (
    <Link to="/login" className="font-medium text-primary hover:underline">
      Back to sign in
    </Link>
  );

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" description="We have sent instructions if the address is registered." footer={footer}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck className="h-10 w-10 text-primary" aria-hidden />
          <p className="text-sm">
            If an account exists for <strong className="break-all">{sentTo}</strong>, a link to reset the password is on its way. It
            works once and expires in 60 minutes.
          </p>
          {import.meta.env.DEV && (
            <p className="rounded-md border bg-muted p-3 text-left text-xs text-muted-foreground">
              <strong>Development mode:</strong> no real email is sent. Open the terminal running the backend (
              <code>npm run dev</code>) and copy the reset link printed there.
            </p>
          )}
          <Button variant="outline" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we will send you a link to choose a new one."
      footer={footer}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} {...register('email')} />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
