import axios from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiErrorBody } from '@/types/api';

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (error.response?.data?.message) return error.response.data.message;
    if (error.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  }
  return fallback;
}

/** Copies backend per-field validation errors onto the matching form fields. Returns true if any were set. */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return false;
  const errors = error.response?.data?.errors;
  if (!errors) return false;
  let applied = false;
  for (const [field, messages] of Object.entries(errors)) {
    if (messages?.[0]) {
      setError(field as Path<T>, { type: 'server', message: messages[0] });
      applied = true;
    }
  }
  return applied;
}
