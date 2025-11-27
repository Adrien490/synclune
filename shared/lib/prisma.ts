import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configuration WebSocket pour Node.js (dev server)
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };