// import { env } from '@/env'
// import { PrismaClient } from '@prisma/client'

// export const prisma = new PrismaClient({
//   log:
//     env.NODE_ENV === 'dev'
//       ? ['query', 'info', 'warn', 'error']
//       : ['warn', 'error'],
// })
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
}, {
  schema: process.env.DATABASE_SCHEMA
});

export const prisma = new PrismaClient({ adapter });