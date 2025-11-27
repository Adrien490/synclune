import { PrismaClient } from "../../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
	prisma: PrismaClient;
};

if (!globalForPrisma.prisma) {
	const adapter = new PrismaPg({
		// Utiliser POSTGRES_PRISMA_URL (poolée) en priorité pour Vercel serverless
		connectionString: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL,
	});
	globalForPrisma.prisma = new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma;

export { prisma };
