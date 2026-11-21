import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PageSpinner } from '@/components/PageSpinner';
import { AppLayout } from '@/components/layout/AppLayout';
import { GuestRoute, ProtectedRoute } from '@/features/auth/RouteGuards';

// Each page is its own chunk, so the first load only downloads what the visitor needs.
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ApplicationsPage = lazy(() =>
  import('@/features/applications/pages/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })),
);
const ApplicationDetailsPage = lazy(() =>
  import('@/features/applications/pages/ApplicationDetailsPage').then((m) => ({
    default: m.ApplicationDetailsPage,
  })),
);
const EditApplicationPage = lazy(() =>
  import('@/features/applications/pages/EditApplicationPage').then((m) => ({
    default: m.EditApplicationPage,
  })),
);
const NewApplicationPage = lazy(() =>
  import('@/features/applications/pages/NewApplicationPage').then((m) => ({
    default: m.NewApplicationPage,
  })),
);
const page = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));

const CompaniesPage = page(() => import('@/features/companies/pages/CompaniesPage'), 'CompaniesPage');
const NewCompanyPage = page(() => import('@/features/companies/pages/NewCompanyPage'), 'NewCompanyPage');
const CompanyDetailsPage = page(() => import('@/features/companies/pages/CompanyDetailsPage'), 'CompanyDetailsPage');
const EditCompanyPage = page(() => import('@/features/companies/pages/EditCompanyPage'), 'EditCompanyPage');
const RecruitersPage = page(() => import('@/features/recruiters/pages/RecruitersPage'), 'RecruitersPage');
const NewRecruiterPage = page(() => import('@/features/recruiters/pages/NewRecruiterPage'), 'NewRecruiterPage');
const RecruiterDetailsPage = page(() => import('@/features/recruiters/pages/RecruiterDetailsPage'), 'RecruiterDetailsPage');
const EditRecruiterPage = page(() => import('@/features/recruiters/pages/EditRecruiterPage'), 'EditRecruiterPage');
const InterviewsPage = page(() => import('@/features/interviews/pages/InterviewsPage'), 'InterviewsPage');
const NewInterviewPage = page(() => import('@/features/interviews/pages/NewInterviewPage'), 'NewInterviewPage');
const InterviewDetailsPage = page(() => import('@/features/interviews/pages/InterviewDetailsPage'), 'InterviewDetailsPage');
const EditInterviewPage = page(() => import('@/features/interviews/pages/EditInterviewPage'), 'EditInterviewPage');
const TasksPage = page(() => import('@/features/tasks/pages/TasksPage'), 'TasksPage');
const NewTaskPage = page(() => import('@/features/tasks/pages/NewTaskPage'), 'NewTaskPage');
const EditTaskPage = page(() => import('@/features/tasks/pages/EditTaskPage'), 'EditTaskPage');
const DocumentsPage = page(() => import('@/features/documents/pages/DocumentsPage'), 'DocumentsPage');
const NewDocumentPage = page(() => import('@/features/documents/pages/NewDocumentPage'), 'NewDocumentPage');
const EditDocumentPage = page(() => import('@/features/documents/pages/EditDocumentPage'), 'EditDocumentPage');
const NotificationsPage = page(
  () => import('@/features/notifications/pages/NotificationsPage'),
  'NotificationsPage',
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

const withSuspense = (node: ReactNode) => <Suspense fallback={<PageSpinner />}>{node}</Suspense>;

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/register', element: withSuspense(<RegisterPage />) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/applications', element: <ApplicationsPage /> },
          { path: '/applications/new', element: <NewApplicationPage /> },
          { path: '/applications/:id', element: <ApplicationDetailsPage /> },
          { path: '/applications/:id/edit', element: <EditApplicationPage /> },
          { path: '/companies', element: <CompaniesPage /> },
          { path: '/companies/new', element: <NewCompanyPage /> },
          { path: '/companies/:id', element: <CompanyDetailsPage /> },
          { path: '/companies/:id/edit', element: <EditCompanyPage /> },
          { path: '/recruiters', element: <RecruitersPage /> },
          { path: '/recruiters/new', element: <NewRecruiterPage /> },
          { path: '/recruiters/:id', element: <RecruiterDetailsPage /> },
          { path: '/recruiters/:id/edit', element: <EditRecruiterPage /> },
          { path: '/interviews', element: <InterviewsPage /> },
          { path: '/interviews/new', element: <NewInterviewPage /> },
          { path: '/interviews/:id', element: <InterviewDetailsPage /> },
          { path: '/interviews/:id/edit', element: <EditInterviewPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/tasks/new', element: <NewTaskPage /> },
          { path: '/tasks/:id/edit', element: <EditTaskPage /> },
          { path: '/documents', element: <DocumentsPage /> },
          { path: '/documents/new', element: <NewDocumentPage /> },
          { path: '/documents/:id/edit', element: <EditDocumentPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: withSuspense(<NotFoundPage />) },
]);
