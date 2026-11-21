import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/PageSpinner';
import { useAuth } from './AuthContext';

/** Only logged-in users get through; others are sent to /login and returned afterwards. */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, isError, retry } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSpinner />;
  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-medium">Could not reach the server</p>
        <p className="text-sm text-muted-foreground">Check that the backend is running, then retry.</p>
        <Button onClick={retry}>Retry</Button>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Login/register pages: logged-in users are bounced to the dashboard. */
export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
