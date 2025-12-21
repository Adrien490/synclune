/**
 * Script de nettoyage des wishlists expirées
 *
 * Ce script :
 * 1. Supprime les wishlists guest (sessionId) dont expiresAt est dépassé
 * 2. Supprime les WishlistItems orphelins (si cascade n'a pas fonctionné)
 *
 * Usage :
 * pnpm exec tsx scripts/cleanup-expired-wishlists.ts
 * pnpm exec tsx scripts/cleanup-expired-wishlists.ts --dry-run  # Pour voir ce qui serait supprimé
 */

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";

// ============================================================================
// CONFIGURATION
// ============================================================================

const DRY_RUN = process.argv.includes("--dry-run");

// Initialisation Prisma
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	console.log("🧹 Nettoyage des wishlists expirées...\n");

	if (DRY_RUN) {
		console.log("⚠️  Mode dry-run activé - aucune suppression effectuée\n");
	}

	const now = new Date();

	// 1. Compter les wishlists expirées
	const expiredWishlistsCount = await prisma.wishlist.count({
		where: {
			expiresAt: { lt: now },
			userId: null, // Seulement les wishlists guest
		},
	});

	console.log(`📊 Wishlists guest expirées trouvées: ${expiredWishlistsCount}`);

	if (expiredWishlistsCount === 0) {
		console.log("✅ Aucune wishlist à nettoyer");
		return;
	}

	// 2. Récupérer les IDs pour le rapport
	const expiredWishlists = await prisma.wishlist.findMany({
		where: {
			expiresAt: { lt: now },
			userId: null,
		},
		select: {
			id: true,
			sessionId: true,
			expiresAt: true,
			_count: { select: { items: true } },
		},
		take: 100, // Limiter pour le rapport
	});

	console.log("\n📋 Aperçu des wishlists à supprimer:");
	for (const wishlist of expiredWishlists.slice(0, 10)) {
		console.log(
			`   - Wishlist ${wishlist.id.slice(0, 8)}... | ${wishlist._count.items} items | Expirée: ${wishlist.expiresAt?.toISOString()}`
		);
	}
	if (expiredWishlists.length > 10) {
		console.log(`   ... et ${expiredWishlists.length - 10} autres`);
	}

	// 3. Supprimer les wishlists expirées (cascade supprimera les WishlistItems)
	if (!DRY_RUN) {
		const deleteResult = await prisma.wishlist.deleteMany({
			where: {
				expiresAt: { lt: now },
				userId: null,
			},
		});

		console.log(`\n✅ ${deleteResult.count} wishlists supprimées`);

		// 4. Vérifier les WishlistItems orphelins (au cas où)
		const orphanedItems = await prisma.wishlistItem.count({
			where: {
				wishlist: null,
			},
		});

		if (orphanedItems > 0) {
			console.log(`⚠️  ${orphanedItems} WishlistItems orphelins trouvés`);
			const deleteOrphans = await prisma.wishlistItem.deleteMany({
				where: {
					wishlist: null,
				},
			});
			console.log(`✅ ${deleteOrphans.count} WishlistItems orphelins supprimés`);
		}
	} else {
		console.log(`\n🔍 Dry-run: ${expiredWishlistsCount} wishlists seraient supprimées`);
	}

	console.log("\n🎉 Nettoyage terminé");
}

main()
	.catch((error) => {
		console.error("❌ Erreur:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
