import "server-only";

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { traceContext } from "@prisma/sqlcommenter-trace-context";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && process.env.NODE_ENV !== "test") {
	throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * Sélection de l'adapter PAR HOST — même règle que
 * `test/integration/prisma-client.ts`, où elle est en place depuis l'origine.
 *
 * ⚠️ Pourquoi c'est nécessaire ici aussi : `@neondatabase/serverless` parle au
 * proxy WebSocket de Neon. Un Postgres standard (service container de la CI,
 * docker local) ne l'expose pas et répond « Received network error or non-101
 * status code » — l'erreur qui faisait échouer les suites d'intégration dès
 * qu'elles appelaient du code applicatif, puisque celui-ci importe CE
 * singleton et non le client d'intégration (audit CI 2026-08-16).
 *
 * En production, `DATABASE_URL` pointe sur `*.neon.tech` : le comportement est
 * strictement inchangé.
 */
const isNeonHost = (() => {
	if (!databaseUrl) return true;
	try {
		return new URL(databaseUrl).hostname.endsWith(".neon.tech");
	} catch {
		// URL malformée : on garde le comportement historique plutôt que de
		// basculer silencieusement de driver sur une valeur qu'on ne comprend pas.
		return true;
	}
})();

const adapter = isNeonHost
	? new PrismaNeon({ connectionString: databaseUrl! })
	: new PrismaPg({ connectionString: databaseUrl! });

/**
 * Client Prisma avec Neon serverless adapter
 *
 * Soft Delete :
 * - Les modèles Order, User, Product, ProductVariant et Discount ont un champ `deletedAt` pour le soft delete
 * - Le filtrage automatique n'est PAS implémenté via $extends pour éviter
 *   les problèmes de compatibilité avec les transactions Prisma
 * - Utiliser `where: {}` explicitement dans les requêtes
 *
 * Conformité légale (Art. L123-22 Code de Commerce) :
 * - Ne JAMAIS supprimer physiquement les données comptables (Order, Refund, Payment)
 * - Utiliser le soft delete : update({ data: { deletedAt: new Date() } })
 * - Conservation obligatoire : 10 ans
 */
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter,
		// `query` retiré en dev : Prisma 7 émet `WHERE id IN (NULL)` sur les preloads
		// d'includes quand le parent renvoie 0 ligne (panier vide, liste filtrée vide…).
		// Bruit verbeux non bloquant. Pour debugger une query : remettre "query" temporairement.
		log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
		comments: [traceContext()],
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}

export { prisma };

// Plus de `notDeleted` : le soft delete a disparu avec le schéma lean (lot 2).

// Plus de helper `softDelete` : sa DERNIÈRE entrée (`discount`) est partie avec
// les codes promo le 2026-08-05, et les cinq précédentes (`order`, `user`,
// `orderNote`, `product`, `productVariant`) n'avaient déjà aucun appelant. Chaque
// module pose son `deletedAt` dans sa propre transaction, avec les écritures qui
// l'accompagnent (purge des liaisons, audit, promotion d'un défaut) ; un helper
// mono-ligne à côté ne faisait que suggérer un raccourci qui aurait sauté ces
// étapes. Ne pas le recréer « au cas où » — le recréer le jour où un appelant
// existe, et pas avant.
