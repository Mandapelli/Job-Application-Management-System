import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError';
import { tokenStore } from '@/lib/authToken';
import { formatDate } from '@/lib/format';
import { authApi } from '../auth.api';
import { useAuth } from '../AuthContext';
import { changePasswordSchema, type ChangePasswordForm } from '../schemas';

function ChangePasswordCard() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      const { token } = await authApi.changePassword({ currentPassword, newPassword });
      tokenStore.set(token); // the old token no longer works, so switch this device to the new one and stay signed in
      reset();
      toast.success('Password changed. Your other devices have been signed out.');
    } catch (error) {
      // e.g. "Current password is incorrect" appears under the current-password box.
      if (!applyFieldErrors(error, setError)) toast.error(getErrorMessage(error, 'Could not change the password'));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>
          You will stay signed in here. Any other device where you are signed in will be signed out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
          <FormField label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
            <PasswordInput id="currentPassword" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register('currentPassword')} />
          </FormField>
          <FormField label="New password" htmlFor="newPassword" error={errors.newPassword?.message}>
            <PasswordInput id="newPassword" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register('newPassword')} />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
          </FormField>
          <p className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Your details and sign-in settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="profile-name">
            <Input id="profile-name" value={user?.name ?? ''} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Email" htmlFor="profile-email">
            <Input id="profile-email" value={user?.email ?? ''} readOnly className="bg-muted" />
          </FormField>
          {user && <p className="text-xs text-muted-foreground sm:col-span-2">Member since {formatDate(user.createdAt)}</p>}
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
