/**
 * Seed minimal — schéma lean (migration lot 2).
 *
 * Jeu de démonstration volontairement petit : 3 collections, une palette de
 * couleurs/matériaux, 7 types de bijoux (slugs système du guide des tailles),
 * 5 produits avec variantes + médias placeholder.
 *
 * ⚠️ Le catalogue en base n'est PAS la DA (cf. CLAUDE.md) : visuels placeholder.
 * Idempotent par `upsert` sur les identités uniques (slug/name).
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { SYSTEM_PRODUCT_TYPE_SLUGS } from "../modules/product-types/constants/system-product-type-slugs";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("[seed] DATABASE_URL manquant");
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const PLACEHOLDER_IMAGE = (seed: string) => `https://picsum.photos/seed/${seed}/1200/1200`;

async function main() {
	// ------------------------------------------------------------------
	// Types de bijoux (slugs système = ceux que le guide des tailles connaît)
	// ------------------------------------------------------------------
	const typeDefs: Array<{ slug: string; label: string }> = [
		{ slug: SYSTEM_PRODUCT_TYPE_SLUGS.NECKLACES, label: "Colliers" },
		{ slug: SYSTEM_PRODUCT_TYPE_SLUGS.BRACELETS, label: "Bracelets" },
		{ slug: SYSTEM_PRODUCT_TYPE_SLUGS.RINGS, label: "Bagues" },
		{ slug: SYSTEM_PRODUCT_TYPE_SLUGS.BODY_CHAINS, label: "Chaînes de corps" },
		{ slug: SYSTEM_PRODUCT_TYPE_SLUGS.PAPILLOUX, label: "Papilloux" },
		{ slug: SYSTEM_PRODUCT_TYPE_SLUGS.HAIR_CHAINS, label: "Chaînes de cheveux" },
		{ slug: SYSTEM_PRODUCT_TYPE_SLUGS.KEYRINGS, label: "Porte-clés" },
	];
	const types: Record<string, { id: string }> = {};
	for (const [index, def] of typeDefs.entries()) {
		types[def.slug] = await prisma.productType.upsert({
			where: { slug: def.slug },
			update: { label: def.label, position: index },
			create: { slug: def.slug, label: def.label, position: index },
		});
	}

	// ------------------------------------------------------------------
	// Couleurs
	// ------------------------------------------------------------------
	const colorDefs = [
		{ name: "Rose bonbon", hex: "#F0568F" },
		{ name: "Lavande", hex: "#B9A7E8" },
		{ name: "Menthe", hex: "#8FD8C0" },
		{ name: "Soleil", hex: "#F5CF3C" },
		{ name: "Bleu nuit", hex: "#26418F" },
		{ name: "Cristal", hex: "#E8F4F8" },
	];
	const colors: Record<string, { id: string }> = {};
	for (const [index, def] of colorDefs.entries()) {
		colors[def.name] = await prisma.color.upsert({
			where: { name: def.name },
			update: { hex: def.hex, position: index },
			create: { name: def.name, hex: def.hex, position: index },
		});
	}

	// ------------------------------------------------------------------
	// Matériaux
	// ------------------------------------------------------------------
	const materialDefs = ["Acier inoxydable", "Perles de verre", "Résine", "Plastique fou"];
	const materials: Record<string, { id: string }> = {};
	for (const [index, name] of materialDefs.entries()) {
		materials[name] = await prisma.material.upsert({
			where: { name },
			update: { position: index },
			create: { name, position: index },
		});
	}

	// ------------------------------------------------------------------
	// Collections
	// ------------------------------------------------------------------
	const collectionDefs = [
		{
			slug: "jardin-fantastique",
			name: "Jardin fantastique",
			description: "Raisins, grappes, feuilles et nénuphars — le jardin qui pousse en bijoux.",
		},
		{
			slug: "ciel-cosmique",
			name: "Ciel cosmique",
			description: "Lunes, constellations et tourbillons peints à la main.",
		},
		{
			slug: "arc-en-ciel-liquide",
			name: "Arc-en-ciel liquide",
			description: "Des gouttes en séquence, du rose au bleu nuit.",
		},
	];
	const collections: Record<string, { id: string }> = {};
	for (const [index, def] of collectionDefs.entries()) {
		collections[def.slug] = await prisma.collection.upsert({
			where: { slug: def.slug },
			update: { name: def.name, description: def.description, position: index, active: true },
			create: {
				slug: def.slug,
				name: def.name,
				description: def.description,
				position: index,
				active: true,
			},
		});
	}

	// ------------------------------------------------------------------
	// Produits (5) — chacun AU MOINS une variante, média produit placeholder
	// ------------------------------------------------------------------
	const productDefs: Array<{
		slug: string;
		name: string;
		description: string;
		priceCents: number;
		typeSlug: string;
		collectionSlugs: string[];
		variants: Array<{
			colorName?: string;
			materialName?: string;
			size?: string;
			priceCents?: number;
			stock: number;
		}>;
	}> = [
		{
			slug: "collier-goutte-arc-en-ciel",
			name: "Collier goutte arc-en-ciel",
			description:
				"Une cascade de gouttes de verre colorées sur chaîne acier — l'arc-en-ciel à porter.",
			priceCents: 3800,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.NECKLACES,
			collectionSlugs: ["arc-en-ciel-liquide"],
			variants: [
				{ colorName: "Rose bonbon", materialName: "Perles de verre", stock: 3 },
				{ colorName: "Bleu nuit", materialName: "Perles de verre", stock: 2 },
			],
		},
		{
			slug: "bague-nuit-etoilee",
			name: "Bague Nuit étoilée",
			description: "Cabochon peint à la main, filiation Van Gogh — un tableau miniature au doigt.",
			priceCents: 3200,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.RINGS,
			collectionSlugs: ["ciel-cosmique"],
			variants: [
				{ colorName: "Bleu nuit", materialName: "Résine", size: "52", stock: 2 },
				{ colorName: "Bleu nuit", materialName: "Résine", size: "54", stock: 1 },
				{ colorName: "Bleu nuit", materialName: "Résine", size: "Ajustable", stock: 4 },
			],
		},
		{
			slug: "creoles-grappe-de-raisin",
			name: "Créoles grappe de raisin",
			description: "Petites grappes de perles vertes sur créoles acier — le jardin à l'oreille.",
			priceCents: 2600,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.NECKLACES,
			collectionSlugs: ["jardin-fantastique"],
			variants: [
				{ colorName: "Menthe", materialName: "Perles de verre", stock: 5 },
				{ colorName: "Lavande", materialName: "Perles de verre", stock: 0 },
			],
		},
		{
			slug: "bracelet-pluie-joyeuse",
			name: "Bracelet pluie joyeuse",
			description: "Des gouttes translucides qui s'entrechoquent — la pluie, version fête.",
			priceCents: 2400,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.BRACELETS,
			collectionSlugs: ["arc-en-ciel-liquide", "ciel-cosmique"],
			variants: [
				{ colorName: "Cristal", materialName: "Résine", size: "16cm", stock: 3 },
				{ colorName: "Cristal", materialName: "Résine", size: "18cm", stock: 3, priceCents: 2600 },
			],
		},
		{
			slug: "porte-cles-nenuphar",
			name: "Porte-clés nénuphar",
			description: "Un nénuphar en plastique fou peint main, à emporter partout.",
			priceCents: 1400,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.KEYRINGS,
			collectionSlugs: ["jardin-fantastique"],
			variants: [{ colorName: "Soleil", materialName: "Plastique fou", stock: 8 }],
		},
	];

	for (const def of productDefs) {
		const product = await prisma.product.upsert({
			where: { slug: def.slug },
			update: {
				name: def.name,
				description: def.description,
				priceCents: def.priceCents,
				active: true,
				typeId: types[def.typeSlug]!.id,
				collections: { set: def.collectionSlugs.map((slug) => ({ id: collections[slug]!.id })) },
			},
			create: {
				slug: def.slug,
				name: def.name,
				description: def.description,
				priceCents: def.priceCents,
				active: true,
				typeId: types[def.typeSlug]!.id,
				collections: {
					connect: def.collectionSlugs.map((slug) => ({ id: collections[slug]!.id })),
				},
			},
		});

		// Médias : resynchronisation complète (2 images placeholder par produit)
		await prisma.productMedia.deleteMany({ where: { productId: product.id } });
		await prisma.productMedia.createMany({
			data: [0, 1].map((position) => ({
				productId: product.id,
				url: PLACEHOLDER_IMAGE(`${def.slug}-${position}`),
				alt: `${def.name} — vue ${position + 1}`,
				type: "IMAGE" as const,
				position,
			})),
		});

		// Variantes : resynchronisation complète
		await prisma.productVariant.deleteMany({ where: { productId: product.id } });
		for (const v of def.variants) {
			await prisma.productVariant.create({
				data: {
					productId: product.id,
					colorId: v.colorName ? colors[v.colorName]!.id : null,
					materialId: v.materialName ? materials[v.materialName]!.id : null,
					size: v.size ?? null,
					priceCents: v.priceCents ?? null,
					stock: v.stock,
					active: true,
				},
			});
		}
	}

	console.log(
		`[seed] OK — ${typeDefs.length} types, ${colorDefs.length} couleurs, ${materialDefs.length} matériaux, ${collectionDefs.length} collections, ${productDefs.length} produits`,
	);
}

main()
	.catch((e) => {
		console.error("[seed] échec :", e);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
