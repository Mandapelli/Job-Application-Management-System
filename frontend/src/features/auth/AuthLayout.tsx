import { Briefcase } from 'lucide-react';
import type { ReactNode } from 'react';
import { ThemeButton } from '@/components/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <ThemeButton className="absolute right-4 top-4" />
      <div className="mb-6 flex items-center gap-2 text-xl font-bold">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Briefcase className="h-5 w-5" />
        </span>
        CareerTrack
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        </CardContent>
      </Card>
    </main>
  );
}
