import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma.js';

// Deleting users cascades to companies, applications and history.
beforeEach(async () => {
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
