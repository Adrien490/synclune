import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

// Configuration pour Vercel serverless
// WebSocket pour Node.js + HTTP fetch pour plus de fiabilité
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

// Type declaration pour le singleton global
declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL!;

function createPrismaClient(): PrismaClient {
  // Utiliser Pool pour une meilleure gestion des connexions
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter });
}

// Pattern singleton pour environnements serverless
const prisma = globalThis.prisma ?? createPrismaClient();

// Préserver l'instance en développement (hot reload)
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { prisma };