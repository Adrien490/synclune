import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

/**
 * Client Prisma avec configuration PostgreSQL
 *
 * Soft Delete :
 * - Les modèles Order, User, Refund ont un champ `deletedAt` pour le soft delete
 * - Le filtrage automatique n'est PAS implémenté via $extends pour éviter
 *   les problèmes de compatibilité avec les transactions Prisma
 * - Utiliser `where: { deletedAt: null }` explicitement dans les requêtes
 *
 * Conformité légale (Art. L123-22 Code de Commerce) :
 * - Ne JAMAIS supprimer physiquement les données comptables (Order, Refund, Payment)
 * - Utiliser le soft delete : update({ data: { deletedAt: new Date() } })
 * - Conservation obligatoire : 10 ans
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter,
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export { prisma };

/**
 * Helper pour filtrer les enregistrements soft-deleted
 * À utiliser dans les clauses `where` des requêtes Prisma
 *
 * @example
 * import { notDeleted } from "@/shared/lib/prisma";
 * const users = await prisma.user.findMany({
 *   where: { ...notDeleted, role: "USER" }
 * });
 */
export const notDeleted = { deletedAt: null } as const;

/**
 * Helper pour soft delete - Usage recommandé
 *
 * @example
 * import { softDelete } from "@/shared/lib/prisma";
 * await softDelete.order(orderId);
 * await softDelete.user(userId);
 * await softDelete.refund(refundId);
 */
export const softDelete = {
  order: (id: string) => prisma.order.update({ where: { id }, data: { deletedAt: new Date() } }),
  user: (id: string) => prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
  refund: (id: string) => prisma.refund.update({ where: { id }, data: { deletedAt: new Date() } }),
  orderNote: (id: string) => prisma.orderNote.update({ where: { id }, data: { deletedAt: new Date() } }),
  discountUsage: (id: string) => prisma.discountUsage.update({ where: { id }, data: { deletedAt: new Date() } }),
  newsletterSubscriber: (id: string) => prisma.newsletterSubscriber.update({ where: { id }, data: { deletedAt: new Date() } }),
};
