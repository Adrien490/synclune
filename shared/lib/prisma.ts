import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configuration WebSocket pour Node.js
neonConfig.webSocketConstructor = ws;

// Utiliser fetch pour les requêtes (plus stable en serverless)
neonConfig.poolQueryViaFetch = true;

// Type declaration pour le singleton global
declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL!;

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

// Pattern singleton pour environnements serverless
const prisma = globalThis.prisma ?? createPrismaClient();

// Préserver l'instance en développement (hot reload)
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { prisma };
