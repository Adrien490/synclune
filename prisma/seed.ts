/**
 * Seed de démonstration — CONFORME À LA DA (migration lot 8).
 *
 * L'ancien jeu était le contre-brief exact (plaqué or, Swarovski, visuels
 * « joaillerie ») ; celui-ci parle la langue de la marque (docs/BRAND-DA.md) :
 * bijoux miniatures colorés et expressifs, faits main à Nantes, six
 * territoires — jardin fantastique, ciel cosmique, arc-en-ciel liquide,
 * pluie et larmes joyeuses, peinture miniature, enfance.
 *
 * - 4 collections nommées dans les territoires ;
 * - palette fidèle aux accents de marque (+ les couleurs de bijoux qui
 *   reviennent dans le lexique : turquoise, vert grappe, abricot) ;
 * - matériaux VRAIS du § Produits & matières (acier inoxydable, perles de
 *   verre, résine, acrylique, plastique fou, chaînes argentée/dorée — pas
 *   d'or fin ni d'argent 925) ;
 * - 14 produits aux noms narratifs, prix 12-45 €, chaque produit ≥ 1
 *   variante, beaucoup de stock=1 (pièces uniques), quelques
 *   multi-variantes (tailles de bague, longueurs) ;
 * - visuels placeholder stables et licites (picsum, seedés par slug) — le
 *   catalogue en base n'est PAS la DA visuelle, mais les alt sont des vrais
 *   alt SEO descriptifs.
 *
 * Idempotent par `upsert` sur les identités uniques (slug/name) ; médias et
 * variantes resynchronisés en bloc (deleteMany + create) à chaque run.
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

/** Type non-système : l'admin crée librement, les boucles sont centrales au lexique. */
const EARRINGS_SLUG = "boucles-oreilles";

async function main() {
	// ------------------------------------------------------------------
	// Types de bijoux — les 7 slugs système (guide des tailles) + boucles
	// ------------------------------------------------------------------
	const typeDefs: Array<{ slug: string; label: string }> = [
		{ slug: SYSTEM_PRODUCT_TYPE_SLUGS.NECKLACES, label: "Colliers" },
		{ slug: EARRINGS_SLUG, label: "Boucles d'oreilles" },
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
	// Couleurs — les accents de marque + les couleurs de bijoux du lexique
	// ------------------------------------------------------------------
	const colorDefs = [
		{ name: "Rose bonbon", hex: "#F0568F" },
		{ name: "Lavande", hex: "#B9A7E8" },
		{ name: "Menthe", hex: "#8FD8C0" },
		{ name: "Soleil", hex: "#F5CF3C" },
		{ name: "Turquoise", hex: "#3EC3C9" },
		{ name: "Vert grappe", hex: "#7BAE4E" },
		{ name: "Abricot", hex: "#F5A26B" },
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
	// Matériaux — § Produits & matières, rien de précieux
	// ------------------------------------------------------------------
	const materialDefs = [
		"Acier inoxydable",
		"Perles de verre",
		"Résine",
		"Acrylique",
		"Plastique fou",
		"Chaîne argentée",
		"Chaîne dorée",
	];
	const materials: Record<string, { id: string }> = {};
	for (const [index, name] of materialDefs.entries()) {
		materials[name] = await prisma.material.upsert({
			where: { name },
			update: { position: index },
			create: { name, position: index },
		});
	}

	// ------------------------------------------------------------------
	// Collections — 4 territoires de la marque
	// ------------------------------------------------------------------
	const collectionDefs = [
		{
			slug: "jardin-fantastique",
			name: "Jardin fantastique",
			description:
				"Raisins, grappes, feuilles et nénuphars — le jardin qui pousse en bijoux, une perle à la fois.",
		},
		{
			slug: "ciel-cosmique",
			name: "Ciel cosmique",
			description:
				"Lunes, constellations et tourbillons peints à la main — le ciel de nuit tient dans un cabochon.",
		},
		{
			slug: "arc-en-ciel-liquide",
			name: "Arc-en-ciel liquide",
			description:
				"Des gouttes en séquence, du rose au bleu nuit — la pluie qui a décidé d'être une fête.",
		},
		{
			slug: "tableaux-a-porter",
			name: "Tableaux à porter",
			description:
				"Peinture miniature sur cabochon, filiation Van Gogh et Monet — des musées de 2 centimètres.",
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
	// Produits (14) — noms narratifs, chaque produit ≥ 1 variante,
	// beaucoup de stock=1 (pièces uniques). `alt` = vrai alt SEO descriptif.
	// ------------------------------------------------------------------
	const productDefs: Array<{
		slug: string;
		name: string;
		description: string;
		/** Base des alt SEO — complétée par « vue N » à la génération. */
		alt: string;
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
		// ⚠️ L'ORDRE DE CRÉATION EST PORTEUR : le catalogue trie par défaut
		// « plus récents en premier » (createdAt desc), donc le DERNIER de ce
		// tableau ouvre l'étal. Les pièces uniques (stock=1) sont créées en
		// premier — les e2e achètent le « premier produit » de l'étal, et une
		// tête d'étal à stock=1 se vidait sous les tests parallèles.
		{
			slug: "chaine-corps-goutte-de-pluie",
			name: "Chaîne de corps goutte de pluie",
			description:
				"Une chaîne argentée qui descend l'épaule, semée de gouttes de verre cristal — la pluie fine portée en écharpe. La pièce la plus longue de l'atelier, montée d'un seul tenant.",
			alt: "chaîne de corps argentée gouttes de verre bijou de créatrice",
			priceCents: 4500,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.BODY_CHAINS,
			collectionSlugs: ["arc-en-ciel-liquide"],
			variants: [{ colorName: "Cristal", materialName: "Chaîne argentée", stock: 1 }],
		},
		{
			slug: "boucles-asymetriques-soleil-nuage",
			name: "Boucles asymétriques soleil-nuage",
			description:
				"Un soleil à une oreille, un nuage à l'autre — la météo complète, peinte sur acrylique et découpée à la main. L'asymétrie n'est pas un défaut, c'est le sujet.",
			alt: "boucles d'oreilles asymétriques soleil et nuage peintes à la main",
			priceCents: 2400,
			typeSlug: EARRINGS_SLUG,
			collectionSlugs: ["ciel-cosmique"],
			variants: [{ colorName: "Soleil", materialName: "Acrylique", stock: 1 }],
		},
		{
			slug: "chaine-cheveux-etoile-filante",
			name: "Chaîne de cheveux étoile filante",
			description:
				"Une fine chaîne dorée qui traverse la coiffure, ponctuée de trois éclats de verre soleil — l'étoile filante qui reste. Pièce unique, se fixe en deux pinces.",
			alt: "chaîne de cheveux dorée éclats de verre bijou de tête artisanal",
			priceCents: 2800,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.HAIR_CHAINS,
			collectionSlugs: ["ciel-cosmique"],
			variants: [{ colorName: "Soleil", materialName: "Chaîne dorée", stock: 1 }],
		},
		{
			slug: "collier-lune-peinte",
			name: "Collier lune peinte",
			description:
				"Une pleine lune peinte en camaïeu de lavande sur cabochon résine, chaîne argentée fine. Le ciel de 23h47, celui où tout est calme. Pièce unique.",
			alt: "collier lune peinte à la main sur cabochon résine pièce unique",
			priceCents: 3600,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.NECKLACES,
			collectionSlugs: ["ciel-cosmique", "tableaux-a-porter"],
			variants: [{ colorName: "Lavande", materialName: "Chaîne argentée", stock: 1 }],
		},
		{
			slug: "bague-cabochon-abricot",
			name: "Bague cabochon abricot",
			description:
				"Un demi-abricot en acrylique peint, monté sur anneau ajustable — le fruit d'été qui ne s'abîme jamais. Naïve et assumée, exactement comme il faut.",
			alt: "bague ajustable cabochon abricot peint à la main",
			priceCents: 1800,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.RINGS,
			collectionSlugs: ["jardin-fantastique"],
			variants: [{ colorName: "Abricot", materialName: "Acrylique", size: "Ajustable", stock: 1 }],
		},
		{
			slug: "boucles-gouttes-de-rosee",
			name: "Boucles gouttes de rosée",
			description:
				"Deux gouttes de verre irisé suspendues à des dormeuses acier — la rosée du matin qui aurait décidé de rester. Légères, elles bougent à chaque pas.",
			alt: "boucles d'oreilles pendantes gouttes de verre irisé faites main",
			priceCents: 2200,
			typeSlug: EARRINGS_SLUG,
			collectionSlugs: ["arc-en-ciel-liquide"],
			variants: [
				{ colorName: "Turquoise", materialName: "Perles de verre", stock: 1 },
				{ colorName: "Cristal", materialName: "Perles de verre", stock: 1 },
			],
		},
		{
			slug: "collier-water-lilies",
			name: "Collier Water Lilies",
			description:
				"Un cabochon unique peint d'après les Nymphéas : le bassin, les nuages renversés, trois touches de rose. Pièce unique — quand elle part, elle ne revient pas.",
			alt: "collier cabochon peint à la main nymphéas Monet pièce unique",
			priceCents: 4200,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.NECKLACES,
			collectionSlugs: ["jardin-fantastique", "tableaux-a-porter"],
			variants: [{ colorName: "Turquoise", materialName: "Chaîne dorée", stock: 1 }],
		},
		{
			slug: "creoles-grappe-de-raisin",
			name: "Créoles grappe de raisin",
			description:
				"Des petites grappes de perles de verre montées sur créoles acier — le raisin du jardin fantastique, cueilli à l'oreille. Chaque grappe est assemblée perle à perle.",
			alt: "créoles grappes de perles de verre vertes artisanales",
			priceCents: 2600,
			typeSlug: EARRINGS_SLUG,
			collectionSlugs: ["jardin-fantastique"],
			variants: [
				{ colorName: "Vert grappe", materialName: "Perles de verre", stock: 1 },
				{ colorName: "Lavande", materialName: "Perles de verre", stock: 1 },
			],
		},
		{
			slug: "bracelet-bonbons-acidules",
			name: "Bracelet bonbons acidulés",
			description:
				"Des perles de plastique fou multicolores, découpées et cuites une à une — le sachet de bonbons de la récré, version poignet. Joyeux, un peu décalé, jamais tiède.",
			alt: "bracelet perles multicolores plastique fou coloré fait main",
			priceCents: 1600,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.BRACELETS,
			collectionSlugs: ["arc-en-ciel-liquide"],
			variants: [
				{ colorName: "Rose bonbon", materialName: "Plastique fou", stock: 2 },
				{ colorName: "Menthe", materialName: "Plastique fou", stock: 1 },
			],
		},
		{
			slug: "papillou-tourbillon-violet",
			name: "Papillou tourbillon violet",
			description:
				"Le papillou de la maison : une volute de résine lavande à clipser où tu veux — col, poche, lacet. Petit, têtu, impossible à ranger dans une case.",
			alt: "papillou volute de résine lavande accessoire artisanal",
			priceCents: 1200,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.PAPILLOUX,
			collectionSlugs: ["ciel-cosmique"],
			variants: [{ colorName: "Lavande", materialName: "Résine", stock: 3 }],
		},
		{
			slug: "bague-nuit-etoilee",
			name: "Bague Nuit étoilée",
			description:
				"Un cabochon peint à la main d'après Van Gogh : les tourbillons, les touches jaunes, le bleu profond. Un tableau miniature au doigt, verni pour tenir la nuit entière.",
			alt: "bague cabochon peint à la main inspirée de Van Gogh",
			priceCents: 3200,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.RINGS,
			collectionSlugs: ["ciel-cosmique", "tableaux-a-porter"],
			variants: [
				{ colorName: "Bleu nuit", materialName: "Résine", size: "52", stock: 2 },
				{ colorName: "Bleu nuit", materialName: "Résine", size: "54", stock: 1 },
				{ colorName: "Bleu nuit", materialName: "Résine", size: "Ajustable", stock: 4 },
			],
		},
		{
			slug: "bracelet-pluie-joyeuse",
			name: "Bracelet pluie joyeuse",
			description:
				"Des gouttes translucides qui s'entrechoquent au poignet — la pluie, version fête. Résine coulée à la main, deux longueurs pour tous les poignets.",
			alt: "bracelet gouttes de résine translucides fait main",
			priceCents: 2400,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.BRACELETS,
			collectionSlugs: ["arc-en-ciel-liquide"],
			variants: [
				{ colorName: "Cristal", materialName: "Résine", size: "16cm", stock: 3 },
				{ colorName: "Cristal", materialName: "Résine", size: "18cm", stock: 3, priceCents: 2600 },
			],
		},
		{
			slug: "collier-goutte-arc-en-ciel",
			name: "Collier goutte arc-en-ciel",
			description:
				"Sept gouttes de verre en séquence, du rose au bleu nuit, sur chaîne acier inoxydable. L'arc-en-ciel entier, à hauteur de clavicule — chaque goutte est enfilée à la main dans l'atelier nantais.",
			alt: "collier gouttes de verre arc-en-ciel fait main",
			priceCents: 3800,
			typeSlug: SYSTEM_PRODUCT_TYPE_SLUGS.NECKLACES,
			collectionSlugs: ["arc-en-ciel-liquide"],
			variants: [
				{ colorName: "Rose bonbon", materialName: "Perles de verre", stock: 3 },
				{ colorName: "Bleu nuit", materialName: "Perles de verre", stock: 2 },
			],
		},
		{
			slug: "porte-cles-nenuphar",
			name: "Porte-clés nénuphar",
			description:
				"Un nénuphar en plastique fou, dessiné puis peint à la main avant cuisson — le bassin de Monet accroché à ton trousseau.",
			alt: "porte-clés nénuphar plastique fou peint à la main",
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

		// Médias : resynchronisation complète (2 images placeholder par produit).
		// L'alt est un VRAI alt SEO (descriptif, sans mot d'écran type « image »).
		await prisma.productMedia.deleteMany({ where: { productId: product.id } });
		await prisma.productMedia.createMany({
			data: [
				{ suffix: "", position: 0 },
				{ suffix: " — vue portée", position: 1 },
			].map(({ suffix, position }) => ({
				productId: product.id,
				url: PLACEHOLDER_IMAGE(`${def.slug}-${position}`),
				alt: `${def.alt}${suffix}`,
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
