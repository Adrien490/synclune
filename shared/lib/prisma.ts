import "server-only";

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

/**
 * Client Prisma avec Neon serverless adapter
 *
 * Soft Delete :
 * - Les modèles Order, User, Refund, Product, ProductSku ont un champ `deletedAt` pour le soft delete
 * - Le filtrage automatique n'est PAS implémenté via $extends pour éviter
 *   les problèmes de compatibilité avec les transactions Prisma
 * - Utiliser `where: { deletedAt: null }` explicitement dans les requêtes
 *
 * Conformité légale (Art. L123-22 Code de Commerce) :
 * - Ne JAMAIS supprimer physiquement les données comptables (Order, Refund, Payment)
 * - Utiliser le soft delete : update({ data: { deletedAt: new Date() } })
 * - Conservation obligatoire : 10 ans
 */
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		adapter,
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}

export { prisma };

// ============================================================================
// VÉRIFICATION EXTENSION pg_trgm
// ============================================================================

/**
 * Vérifie que l'extension pg_trgm est installée (une seule fois au démarrage)
 * Nécessaire pour la recherche fuzzy et les suggestions orthographiques
 */
async function verifyPgTrgmExtension() {
	try {
		const result = await prisma.$queryRaw<{ extname: string }[]>`
			SELECT extname::text FROM pg_extension WHERE extname = 'pg_trgm'
		`;
		if (result.length === 0) {
			console.warn(
				"[Prisma] Extension pg_trgm non installée - recherche fuzzy désactivée"
			);
		}
	} catch (error) {
		console.error("[Prisma] Erreur vérification pg_trgm:", error);
	}
}

// Exécuter en dev uniquement (éviter ralentissement cold start en prod)
if (process.env.NODE_ENV === "development") {
	verifyPgTrgmExtension();
}

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
  newsletterSubscriber: (id: string) => prisma.newsletterSubscriber.update({ where: { id }, data: { deletedAt: new Date() } }),
  productReview: (id: string) => prisma.productReview.update({ where: { id }, data: { deletedAt: new Date() } }),
  reviewResponse: (id: string) => prisma.reviewResponse.update({ where: { id }, data: { deletedAt: new Date() } }),
  product: (id: string) => prisma.product.update({ where: { id }, data: { deletedAt: new Date() } }),
  productSku: (id: string) => prisma.productSku.update({ where: { id }, data: { deletedAt: new Date() } }),
  customizationRequest: (id: string) => prisma.customizationRequest.update({ where: { id }, data: { deletedAt: new Date() } }),
  discount: (id: string) => prisma.discount.update({ where: { id }, data: { deletedAt: new Date() } }),
  wishlistItem: (id: string) => prisma.wishlistItem.update({ where: { id }, data: { deletedAt: new Date() } }),
};

