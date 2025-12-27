/**
 * Script d'audit des images sans alt text
 *
 * Ce script analyse la base de données pour identifier :
 * 1. Les images de produits (SkuMedia) sans altText
 * 2. Les images d'avis (ReviewMedia) sans altText
 *
 * Usage :
 * pnpm exec tsx scripts/audit-alt-text.ts
 * pnpm exec tsx scripts/audit-alt-text.ts --csv  # Exporte en CSV
 */

import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "../app/generated/prisma/client"
import * as fs from "fs"
import * as path from "path"

// ============================================================================
// CONFIGURATION
// ============================================================================

const EXPORT_CSV = process.argv.includes("--csv")

// Initialisation Prisma
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ============================================================================
// TYPES
// ============================================================================

interface MissingAltTextImage {
	id: string
	url: string
	type: "SkuMedia" | "ReviewMedia"
	productTitle?: string
	productSlug?: string
	skuCode?: string
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	console.log("🔍 Audit des images sans alt text...\n")

	const missingAltTextImages: MissingAltTextImage[] = []

	// 1. Vérifier les images de SKU sans altText
	console.log("📦 Analyse des images de produits (SkuMedia)...")

	const skuMediaWithoutAlt = await prisma.skuMedia.findMany({
		where: {
			OR: [{ altText: null }, { altText: "" }],
			mediaType: "IMAGE",
		},
		select: {
			id: true,
			url: true,
			sku: {
				select: {
					sku: true,
					product: {
						select: {
							title: true,
							slug: true,
						},
					},
				},
			},
		},
	})

	console.log(`   Trouvé: ${skuMediaWithoutAlt.length} images sans alt text\n`)

	for (const media of skuMediaWithoutAlt) {
		missingAltTextImages.push({
			id: media.id,
			url: media.url,
			type: "SkuMedia",
			productTitle: media.sku.product.title,
			productSlug: media.sku.product.slug,
			skuCode: media.sku.sku,
		})
	}

	// 2. Vérifier les images d'avis sans altText
	console.log("⭐ Analyse des images d'avis (ReviewMedia)...")

	const reviewMediaWithoutAlt = await prisma.reviewMedia.findMany({
		where: {
			OR: [{ altText: null }, { altText: "" }],
		},
		select: {
			id: true,
			url: true,
			review: {
				select: {
					product: {
						select: {
							title: true,
							slug: true,
						},
					},
				},
			},
		},
	})

	console.log(`   Trouvé: ${reviewMediaWithoutAlt.length} images sans alt text\n`)

	for (const media of reviewMediaWithoutAlt) {
		missingAltTextImages.push({
			id: media.id,
			url: media.url,
			type: "ReviewMedia",
			productTitle: media.review.product.title,
			productSlug: media.review.product.slug,
		})
	}

	// 3. Résumé
	console.log("📊 Résumé de l'audit:")
	console.log(`   - Images de produits sans alt: ${skuMediaWithoutAlt.length}`)
	console.log(`   - Images d'avis sans alt: ${reviewMediaWithoutAlt.length}`)
	console.log(`   - Total: ${missingAltTextImages.length}\n`)

	if (missingAltTextImages.length === 0) {
		console.log("✅ Toutes les images ont un alt text !")
		return
	}

	// 4. Afficher les 20 premières
	console.log("📋 Aperçu des images sans alt text (20 premières):\n")

	for (const img of missingAltTextImages.slice(0, 20)) {
		console.log(`   [${img.type}] ${img.productTitle}`)
		console.log(`      SKU: ${img.skuCode || "N/A"}`)
		console.log(`      URL: ${img.url.slice(0, 60)}...`)
		console.log("")
	}

	if (missingAltTextImages.length > 20) {
		console.log(`   ... et ${missingAltTextImages.length - 20} autres\n`)
	}

	// 5. Export CSV si demandé
	if (EXPORT_CSV) {
		const csvPath = path.join(process.cwd(), "audit-alt-text.csv")
		const csvHeader = "id,type,product_title,product_slug,sku_code,url\n"
		const csvRows = missingAltTextImages
			.map(
				(img) =>
					`"${img.id}","${img.type}","${img.productTitle || ""}","${img.productSlug || ""}","${img.skuCode || ""}","${img.url}"`
			)
			.join("\n")

		fs.writeFileSync(csvPath, csvHeader + csvRows)
		console.log(`📄 Export CSV: ${csvPath}`)
	}

	// 6. Suggestions
	console.log("\n💡 Suggestions pour corriger les alt text manquants:")
	console.log("   1. Dans l'admin, éditer chaque SKU et ajouter un alt text descriptif")
	console.log("   2. Utiliser un format type: '[Nom produit] - [Type] fait main Synclune'")
	console.log("   3. Pour les avis, les alt text seront générés automatiquement lors de l'upload")

	console.log("\n🎉 Audit terminé")
}

main()
	.catch((error) => {
		console.error("❌ Erreur:", error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
