/**
 * Script de nettoyage des paniers expirés
 *
 * Ce script :
 * 1. Supprime les paniers guest (sessionId) dont expiresAt est dépassé
 * 2. Supprime les CartItems orphelins (si cascade n'a pas fonctionné)
 *
 * Usage :
 * pnpm exec tsx scripts/cleanup-expired-carts.ts
 * pnpm exec tsx scripts/cleanup-expired-carts.ts --dry-run  # Pour voir ce qui serait supprimé
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
	console.log("🧹 Nettoyage des paniers expirés...\n");

	if (DRY_RUN) {
		console.log("⚠️  Mode dry-run activé - aucune suppression effectuée\n");
	}

	const now = new Date();

	// 1. Compter les paniers expirés
	const expiredCartsCount = await prisma.cart.count({
		where: {
			expiresAt: { lt: now },
			userId: null, // Seulement les paniers guest
		},
	});

	console.log(`📊 Paniers guest expirés trouvés: ${expiredCartsCount}`);

	if (expiredCartsCount === 0) {
		console.log("✅ Aucun panier à nettoyer");
		return;
	}

	// 2. Récupérer les IDs pour le rapport
	const expiredCarts = await prisma.cart.findMany({
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

	console.log("\n📋 Aperçu des paniers à supprimer:");
	for (const cart of expiredCarts.slice(0, 10)) {
		console.log(
			`   - Cart ${cart.id.slice(0, 8)}... | ${cart._count.items} items | Expiré: ${cart.expiresAt?.toISOString()}`
		);
	}
	if (expiredCarts.length > 10) {
		console.log(`   ... et ${expiredCarts.length - 10} autres`);
	}

	// 3. Supprimer les paniers expirés (cascade supprimera les CartItems)
	if (!DRY_RUN) {
		const deleteResult = await prisma.cart.deleteMany({
			where: {
				expiresAt: { lt: now },
				userId: null,
			},
		});

		console.log(`\n✅ ${deleteResult.count} paniers supprimés`);

		// 4. Vérifier les CartItems orphelins (au cas où)
		const orphanedItems = await prisma.cartItem.count({
			where: {
				cart: null,
			},
		});

		if (orphanedItems > 0) {
			console.log(`⚠️  ${orphanedItems} CartItems orphelins trouvés`);
			const deleteOrphans = await prisma.cartItem.deleteMany({
				where: {
					cart: null,
				},
			});
			console.log(`✅ ${deleteOrphans.count} CartItems orphelins supprimés`);
		}
	} else {
		console.log(`\n🔍 Dry-run: ${expiredCartsCount} paniers seraient supprimés`);
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
