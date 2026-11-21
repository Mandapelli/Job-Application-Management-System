import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold">404</p>
      <p className="text-muted-foreground">This page does not exist.</p>
      <Button asChild>
        <Link to="/dashboard">Go to dashboard</Link>
      </Button>
    </main>
  );
}
