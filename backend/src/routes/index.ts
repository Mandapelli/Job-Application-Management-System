import { Router } from 'express';
import { applicationRouter } from './application.routes.js';
import { authRouter } from './auth.routes.js';
import { companyRouter } from './company.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { documentRouter } from './document.routes.js';
import { healthRouter } from './health.routes.js';
import { interviewRouter } from './interview.routes.js';
import { notificationRouter } from './notification.routes.js';
import { recruiterRouter } from './recruiter.routes.js';
import { taskRouter } from './task.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/applications', applicationRouter);
apiRouter.use('/companies', companyRouter);
apiRouter.use('/recruiters', recruiterRouter);
apiRouter.use('/interviews', interviewRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/documents', documentRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/dashboard', dashboardRouter);
// Feature routers (auth, applications, companies, ...) are mounted here in later phases.
