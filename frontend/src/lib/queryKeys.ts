// Every query for a module starts with its key, so one invalidate refreshes that module's lists, counts and details.
// They live here (not in each feature) so features can refresh each other without circular imports.
export const APPLICATIONS_KEY = ['applications'] as const;
export const COMPANIES_KEY = ['companies'] as const;
export const RECRUITERS_KEY = ['recruiters'] as const;
export const INTERVIEWS_KEY = ['interviews'] as const;
export const TASKS_KEY = ['tasks'] as const;
export const DOCUMENTS_KEY = ['documents'] as const;
export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const DASHBOARD_KEY = ['dashboard'] as const;
