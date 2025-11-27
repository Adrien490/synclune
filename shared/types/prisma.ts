import { prisma } from "@/shared/lib/prisma";

/**
 * Type pour une transaction Prisma
 * Utilisé pour typer les opérations en transaction
 *
 * Ce type représente le client Prisma passé dans les callbacks de transaction
 */
export type PrismaTransaction = Parameters<
	Parameters<typeof prisma.$transaction>[0]
>[0];
