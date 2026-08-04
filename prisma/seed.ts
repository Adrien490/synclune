import { scryptSync } from "node:crypto";
import { fakerFR } from "@faker-js/faker";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
	CollectionStatus,
	DiscountType,
	MediaType,
	OrderAction,
	OrderStatus,
	PaymentStatus,
	type Prisma,
	PrismaClient,
	ProductStatus,
	RefundReason,
	RefundStatus,
	HistorySource,
	WebhookEventStatus,
	AccountStatus,
} from "../app/generated/prisma/client";

// ============================================
// PRODUCTION GUARD
// ============================================
if (process.env.NODE_ENV === "production") {
	console.error("❌ Seed interdit en production. Utilisez NODE_ENV=development.");
	process.exit(1);
}

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
	cleanup: process.env.SEED_CLEANUP !== "false",
	orderCount: parseInt(process.env.SEED_ORDER_COUNT ?? "50", 10),
	userCount: parseInt(process.env.SEED_USER_COUNT ?? "29", 10),
	adminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@synclune.fr",
	orderPrefix: process.env.SEED_ORDER_PREFIX ?? "DEV",
};

if (!process.env.DATABASE_URL) {
	console.error("❌ DATABASE_URL is not set. Please set it in your .env file.");
	process.exit(1);
}

// EINV-CASH-004 : le seed fabrique des commandes PAID fictives (PaymentIntent
// factice `pi_…`, paidAt, ET des numéros de facture F-YYYY-NNNNN séquentiels
// réalistes) qui pollueraient le périmètre comptable (exports / livre de
// recettes / e-reporting) s'il tournait contre la production. Triple garde :
// 1. NODE_ENV=production refusé (plus haut) — mais souvent non défini en shell ;
// 2. opt-in explicite SEED_ALLOW=true requis — à poser une fois dans le .env
//    local ; les environnements de production (Vercel) ne le définissent jamais ;
// 3. refus de toute DATABASE_URL contenant "prod"/"production" (défense en
//    profondeur par substring — un host Neon de prod sans "prod" dans l'URL
//    passerait cette garde seule, d'où l'opt-in n°2). Miroir du garde de
//    test/integration/prisma-client.
if (process.env.SEED_ALLOW !== "true") {
	console.error(
		'❌ Seed refusé : définissez SEED_ALLOW="true" dans votre .env de développement (garde anti-production EINV-CASH-004).',
	);
	process.exit(1);
}
if (process.env.DATABASE_URL.includes("prod") || process.env.DATABASE_URL.includes("production")) {
	console.error(
		"❌ Seed interdit : DATABASE_URL contient 'prod'/'production'. Utilisez une base de développement.",
	);
	process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const faker = fakerFR;
faker.seed(42);

// Better Auth password hash format: "salt_hex:derived_key_hex"
// All seed users get password "password123"
const SEED_PASSWORD_HASH = (() => {
	const salt = "a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5";
	const derived = scryptSync("password123".normalize("NFKC"), salt, 64);
	return `${salt}:${derived.toString("hex")}`;
})();

// ============================================
// HELPERS
// ============================================
function sampleBoolean(probability: number): boolean {
	return faker.number.float({ min: 0, max: 1, fractionDigits: 4 }) < probability;
}

function buildOrderNumber(index: number): string {
	return `SYN-${CONFIG.orderPrefix}-${index.toString().padStart(4, "0")}`;
}

// EU country data for realistic multi-country addresses
const EU_COUNTRIES = [
	{ code: "FR", weight: 70, phonePrefixes: ["+33 6", "+33 7"], zipFormat: "#####" },
	{ code: "BE", weight: 10, phonePrefixes: ["+32 4"], zipFormat: "####" },
	{ code: "DE", weight: 10, phonePrefixes: ["+49 1"], zipFormat: "#####" },
	{ code: "ES", weight: 5, phonePrefixes: ["+34 6"], zipFormat: "#####" },
	{ code: "IT", weight: 5, phonePrefixes: ["+39 3"], zipFormat: "#####" },
] as const;

function generateShippingAddress() {
	const line2 = sampleBoolean(0.3) ? faker.location.secondaryAddress() : null;
	const firstName = faker.person.firstName();
	const lastName = faker.person.lastName();
	const country = faker.helpers.weightedArrayElement(
		EU_COUNTRIES.map((c) => ({ weight: c.weight, value: c })),
	);
	const phonePrefix = faker.helpers.arrayElement(country.phonePrefixes);
	const phone = faker.helpers.replaceSymbols(`${phonePrefix} ## ## ## ##`);

	return {
		customerEmail: faker.internet.email({ firstName, lastName }).toLowerCase(),
		customerName: `${firstName} ${lastName}`,
		shippingFirstName: firstName,
		shippingLastName: lastName,
		shippingAddress1: faker.location.streetAddress(),
		shippingAddress2: line2,
		shippingPostalCode: faker.location.zipCode(country.zipFormat),
		shippingCity: faker.location.city(),
		shippingCountry: country.code,
		shippingPhone: phone,
	};
}

function getShippingCostForCountry(country: string): number {
	if (country === "FR")
		return faker.helpers.weightedArrayElement([
			{ weight: 9, value: 499 },
			{ weight: 1, value: 0 },
		]);
	return faker.helpers.weightedArrayElement([
		{ weight: 9, value: 950 },
		{ weight: 1, value: 0 },
	]);
}

function randomRecentDate(): Date {
	const now = new Date();
	const daysAgo = faker.number.int({ min: 1, max: 60 });
	now.setDate(now.getDate() - daysAgo);
	now.setHours(faker.number.int({ min: 8, max: 22 }));
	now.setMinutes(faker.number.int({ min: 0, max: 59 }));
	return now;
}

function logError(context: string, error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	console.warn(`⚠️ [${context}] ${message}`);
}

// ============================================
// CLEANUP (reverse FK dependency order)
// ============================================
async function cleanup(): Promise<void> {
	if (!CONFIG.cleanup) {
		// Cleanup opt-out is only safe on an empty DB. Otherwise the
		// subsequent createMany() calls hit @unique constraints and the seed
		// crashes mid-execution, leaving the DB in a partial state.
		const existingUserCount = await prisma.user.count();
		if (existingUserCount > 0) {
			throw new Error(
				`SEED_CLEANUP=false requires an empty database. Found ${existingUserCount} existing users. ` +
					`Run with SEED_CLEANUP=true (or unset) to wipe and re-seed.`,
			);
		}
		console.log("⏭️  Cleanup skipped (SEED_CLEANUP=false, DB empty)");
		return;
	}

	console.log("🧹 Nettoyage de la base de données...");

	await prisma.orderHistory.deleteMany();
	await prisma.refund.deleteMany();
	await prisma.orderItem.deleteMany();
	await prisma.order.deleteMany();

	await prisma.webhookEvent.deleteMany();
	await prisma.discount.deleteMany();

	await prisma.session.deleteMany();
	await prisma.account.deleteMany();
	await prisma.verification.deleteMany();
	await prisma.user.deleteMany();

	await prisma.skuMedia.deleteMany();
	await prisma.productSku.deleteMany();
	await prisma.productCollection.deleteMany();
	await prisma.product.deleteMany();

	await prisma.collection.deleteMany();
	await prisma.productType.deleteMany();
	await prisma.material.deleteMany();
	await prisma.color.deleteMany();
	await prisma.storeSettings.deleteMany();

	console.log("✅ Base de données nettoyée\n");
}

// ============================================
// DONNÉES DU CATALOGUE
// ============================================

const colorsData: Prisma.ColorCreateManyInput[] = [
	{ slug: "or-jaune", name: "Or jaune", hex: "#FFD700" },
	{ slug: "or-rose", name: "Or rose", hex: "#E8B4B8" },
	{ slug: "or-blanc", name: "Or blanc", hex: "#F5F5F5" },
	{ slug: "argent", name: "Argent", hex: "#C0C0C0" },
	{ slug: "noir", name: "Noir", hex: "#1A1A1A" },
	{ slug: "perle", name: "Perle", hex: "#FDEEF4" },
	{ slug: "cristal", name: "Cristal", hex: "#E8F4F8" },
	{ slug: "emeraude", name: "Émeraude", hex: "#50C878" },
];

const materialsData: Prisma.MaterialCreateManyInput[] = [
	{
		slug: "acier-inoxydable",
		name: "Acier inoxydable",
		description: "Résistant et hypoallergénique",
	},
	{ slug: "plaque-or", name: "Plaqué or", description: "Finition dorée élégante" },
	{ slug: "argent-925", name: "Argent 925", description: "Argent sterling de qualité" },
	{ slug: "laiton", name: "Laiton", description: "Alliage cuivre-zinc vintage" },
	{ slug: "perles-naturelles", name: "Perles naturelles", description: "Perles d'eau douce" },
	{ slug: "cristal-swarovski", name: "Cristal Swarovski", description: "Cristaux autrichiens" },
];

const productTypesData: Prisma.ProductTypeCreateManyInput[] = [
	{
		slug: "colliers",
		label: "Colliers",
		description: "Ornez votre décolleté avec nos colliers artisanaux",
		isSystem: true,
	},
	{
		slug: "bracelets",
		label: "Bracelets",
		description: "Bracelets délicats pour votre poignet",
		isSystem: true,
	},
	{
		slug: "bagues",
		label: "Bagues",
		description: "Bagues uniques, symboles de beauté",
		isSystem: true,
	},
	{
		slug: "chaines-corps",
		label: "Chaînes de corps",
		description: "Sublimez votre silhouette",
		isSystem: true,
	},
	{
		slug: "papilloux",
		label: "Papilloux",
		description: "Bijoux papillons pour le visage",
		isSystem: true,
	},
	{
		slug: "chaines-cheveux",
		label: "Chaînes de cheveux",
		description: "Accessoires capillaires précieux",
		isSystem: true,
	},
	{
		slug: "porte-cles",
		label: "Porte-clés",
		description: "Petits bijoux du quotidien",
		isSystem: true,
	},
];

const collectionsData: Prisma.CollectionCreateManyInput[] = [
	{
		slug: "nouveautes",
		name: "Nouveautés",
		description: "Nos dernières créations",
		status: CollectionStatus.PUBLIC,
	},
	{
		slug: "best-sellers",
		name: "Best Sellers",
		description: "Les favoris de nos clientes",
		status: CollectionStatus.PUBLIC,
	},
	{
		slug: "mariage",
		name: "Mariage",
		description: "Pour le plus beau jour de votre vie",
		status: CollectionStatus.PUBLIC,
	},
	{
		slug: "fetes",
		name: "Fêtes",
		description: "Brillez pour les occasions spéciales",
		status: CollectionStatus.PUBLIC,
	},
];

// Images Unsplash validées pour les bijoux
const jewelryImages = {
	colliers: [
		"https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&crop=center",
	],
	bracelets: [
		"https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&h=800&fit=crop&crop=center",
	],
	bagues: [
		"https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1599458252573-56ae36120de1?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1603561596112-0a132b757442?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&h=800&fit=crop&crop=center",
	],
	chainesCorps: [
		"https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1610694955371-d4a3e0ce4b52?w=800&h=800&fit=crop&crop=center",
	],
	papilloux: [
		"https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=800&h=800&fit=crop&crop=center",
	],
	chainesCheveux: [
		"https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&crop=center",
		"https://images.unsplash.com/photo-1590548784585-643d2b9f2925?w=800&h=800&fit=crop&crop=center",
	],
	porteCles: [
		"https://images.unsplash.com/photo-1634712282287-14ed57b9cc89?w=800&h=800&fit=crop&crop=center",
	],
};

interface ProductSeedData {
	slug: string;
	title: string;
	description: string;
	typeSlug: string;
	skus: {
		colorSlug: string;
		materialSlug: string;
		size?: string;
		price: number;
		inventory: number;
		isDefault?: boolean;
	}[];
	imageCategory: keyof typeof jewelryImages;
	collections: string[];
}

const productsData: ProductSeedData[] = [
	// COLLIERS (4)
	{
		slug: "collier-lune-celeste",
		title: "Collier Lune Céleste",
		description:
			"Un collier délicat orné d'un pendentif lune en plaqué or, symbole de féminité et de mystère.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["nouveautes", "best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 4990,
				inventory: 25,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 4990, inventory: 18 },
			{ colorSlug: "argent", materialSlug: "argent-925", price: 5990, inventory: 12 },
		],
	},
	{
		slug: "collier-perles-eternelles",
		title: "Collier Perles Éternelles",
		description:
			"Un collier classique de perles d'eau douce, raffinement intemporel pour toutes les occasions.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["mariage", "best-sellers"],
		skus: [
			{
				colorSlug: "perle",
				materialSlug: "perles-naturelles",
				price: 8990,
				inventory: 15,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "perles-naturelles", price: 9990, inventory: 8 },
		],
	},
	{
		slug: "collier-cascade-cristal",
		title: "Collier Cascade de Cristal",
		description: "Cascade de cristaux Swarovski pour un éclat incomparable lors de vos soirées.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				price: 7990,
				inventory: 20,
				isDefault: true,
			},
			{ colorSlug: "emeraude", materialSlug: "cristal-swarovski", price: 8490, inventory: 10 },
		],
	},
	{
		slug: "collier-chaine-minimaliste",
		title: "Collier Chaîne Minimaliste",
		description: "Une chaîne fine et élégante, parfaite pour un look épuré au quotidien.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				price: 2990,
				inventory: 35,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "acier-inoxydable", price: 2990, inventory: 30 },
			{ colorSlug: "or-rose", materialSlug: "acier-inoxydable", price: 2990, inventory: 28 },
		],
	},
	// BRACELETS (4)
	{
		slug: "bracelet-jonc-torsade",
		title: "Bracelet Jonc Torsadé",
		description: "Un jonc torsadé élégant qui s'adapte à tous les poignets avec grâce.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 3990,
				inventory: 22,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 3990, inventory: 18 },
			{ colorSlug: "argent", materialSlug: "argent-925", price: 4590, inventory: 15 },
		],
	},
	{
		slug: "bracelet-perles-fines",
		title: "Bracelet Perles Fines",
		description: "Un bracelet délicat de perles fines pour une touche d'élégance naturelle.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["mariage"],
		skus: [
			{
				colorSlug: "perle",
				materialSlug: "perles-naturelles",
				price: 4990,
				inventory: 20,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "perles-naturelles", price: 5490, inventory: 12 },
		],
	},
	{
		slug: "bracelet-chaine-multi-rangs",
		title: "Bracelet Chaîne Multi-Rangs",
		description: "Plusieurs chaînes fines entrelacées pour un effet sophistiqué et moderne.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["nouveautes", "fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				price: 3490,
				inventory: 25,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "acier-inoxydable", price: 3490, inventory: 22 },
		],
	},
	{
		slug: "bracelet-manchette-vintage",
		title: "Bracelet Manchette Vintage",
		description: "Une manchette au style vintage pour affirmer votre personnalité unique.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "laiton",
				price: 4490,
				inventory: 15,
				isDefault: true,
			},
			{ colorSlug: "noir", materialSlug: "laiton", price: 4490, inventory: 10 },
		],
	},
	// BAGUES (4)
	{
		slug: "bague-solitaire-classique",
		title: "Bague Solitaire Classique",
		description: "Une bague solitaire intemporelle avec un cristal central étincelant.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["mariage", "best-sellers"],
		skus: [
			{
				colorSlug: "or-blanc",
				materialSlug: "argent-925",
				size: "52",
				price: 6990,
				inventory: 8,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "argent-925", size: "54", price: 6990, inventory: 10 },
			{ colorSlug: "or-blanc", materialSlug: "argent-925", size: "56", price: 6990, inventory: 7 },
			{ colorSlug: "or-jaune", materialSlug: "plaque-or", size: "54", price: 5990, inventory: 12 },
		],
	},
	{
		slug: "bague-fine-empilable",
		title: "Bague Fine Empilable",
		description: "Une bague fine à empiler avec d'autres pour créer votre propre style.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				size: "52",
				price: 1990,
				inventory: 30,
				isDefault: true,
			},
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				size: "54",
				price: 1990,
				inventory: 28,
			},
			{
				colorSlug: "or-rose",
				materialSlug: "acier-inoxydable",
				size: "52",
				price: 1990,
				inventory: 25,
			},
			{
				colorSlug: "or-rose",
				materialSlug: "acier-inoxydable",
				size: "54",
				price: 1990,
				inventory: 22,
			},
		],
	},
	{
		slug: "bague-fleur-cristal",
		title: "Bague Fleur de Cristal",
		description: "Une bague florale ornée de cristaux pour une touche poétique.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				size: "52",
				price: 5490,
				inventory: 12,
				isDefault: true,
			},
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				size: "54",
				price: 5490,
				inventory: 10,
			},
			{
				colorSlug: "emeraude",
				materialSlug: "cristal-swarovski",
				size: "54",
				price: 5990,
				inventory: 8,
			},
		],
	},
	{
		slug: "bague-chevaliere-moderne",
		title: "Bague Chevalière Moderne",
		description: "Une chevalière revisitée avec un design contemporain et audacieux.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				size: "56",
				price: 4990,
				inventory: 15,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "argent-925", size: "56", price: 5490, inventory: 12 },
			{
				colorSlug: "noir",
				materialSlug: "acier-inoxydable",
				size: "58",
				price: 3990,
				inventory: 18,
			},
		],
	},
	// CHAÎNES DE CORPS (3)
	{
		slug: "chaine-corps-boheme",
		title: "Chaîne de Corps Bohème",
		description: "Une chaîne de corps légère et bohème pour sublimer votre silhouette.",
		typeSlug: "chaines-corps",
		imageCategory: "chainesCorps",
		collections: ["nouveautes", "fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 6990,
				inventory: 10,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "acier-inoxydable", price: 5990, inventory: 12 },
		],
	},
	{
		slug: "chaine-corps-perles",
		title: "Chaîne de Corps Perles",
		description: "Élégance naturelle avec des perles d'eau douce sur une chaîne délicate.",
		typeSlug: "chaines-corps",
		imageCategory: "chainesCorps",
		collections: ["mariage"],
		skus: [
			{
				colorSlug: "perle",
				materialSlug: "perles-naturelles",
				price: 8990,
				inventory: 8,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "perles-naturelles", price: 9490, inventory: 5 },
		],
	},
	{
		slug: "chaine-corps-serpent",
		title: "Chaîne de Corps Serpent",
		description: "Une chaîne serpent audacieuse pour un look captivant et mystérieux.",
		typeSlug: "chaines-corps",
		imageCategory: "chainesCorps",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				price: 7490,
				inventory: 10,
				isDefault: true,
			},
			{ colorSlug: "noir", materialSlug: "acier-inoxydable", price: 7490, inventory: 8 },
		],
	},
	// PAPILLOUX (3)
	{
		slug: "papilloux-cristal-fee",
		title: "Papilloux Cristal Fée",
		description: "Bijou papillon pour le visage orné de cristaux, pour un regard féerique.",
		typeSlug: "papilloux",
		imageCategory: "papilloux",
		collections: ["nouveautes", "fetes"],
		skus: [
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				price: 3990,
				inventory: 20,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "cristal-swarovski", price: 4290, inventory: 15 },
		],
	},
	{
		slug: "papilloux-dore-soleil",
		title: "Papilloux Doré Soleil",
		description: "Un papillon doré qui capture la lumière pour illuminer votre visage.",
		typeSlug: "papilloux",
		imageCategory: "papilloux",
		collections: ["best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 3490,
				inventory: 25,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 3490, inventory: 20 },
		],
	},
	{
		slug: "papilloux-emeraude-mystique",
		title: "Papilloux Émeraude Mystique",
		description: "Un papilloux aux teintes émeraude pour un regard envoûtant.",
		typeSlug: "papilloux",
		imageCategory: "papilloux",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "emeraude",
				materialSlug: "cristal-swarovski",
				price: 4490,
				inventory: 12,
				isDefault: true,
			},
			{ colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 4290, inventory: 10 },
		],
	},
	// CHAÎNES DE CHEVEUX (2)
	{
		slug: "chaine-cheveux-boheme",
		title: "Chaîne de Cheveux Bohème",
		description: "Une chaîne capillaire bohème pour coiffer vos cheveux avec élégance.",
		typeSlug: "chaines-cheveux",
		imageCategory: "chainesCheveux",
		collections: ["mariage", "fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 4990,
				inventory: 15,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "argent-925", price: 5490, inventory: 10 },
		],
	},
	{
		slug: "chaine-cheveux-perles",
		title: "Chaîne de Cheveux Perles",
		description: "Perles délicates tissées dans une chaîne pour une coiffure royale.",
		typeSlug: "chaines-cheveux",
		imageCategory: "chainesCheveux",
		collections: ["mariage"],
		skus: [
			{
				colorSlug: "perle",
				materialSlug: "perles-naturelles",
				price: 6990,
				inventory: 12,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "perles-naturelles", price: 7490, inventory: 8 },
		],
	},
	// PORTE-CLÉS (4)
	{
		slug: "porte-cles-coeur",
		title: "Porte-Clés Cœur",
		description: "Un porte-clés en forme de cœur, petit bijou du quotidien.",
		typeSlug: "porte-cles",
		imageCategory: "porteCles",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				price: 1990,
				inventory: 40,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "acier-inoxydable", price: 1990, inventory: 35 },
			{ colorSlug: "argent", materialSlug: "acier-inoxydable", price: 1990, inventory: 30 },
		],
	},
	{
		slug: "porte-cles-lune-etoile",
		title: "Porte-Clés Lune & Étoile",
		description: "Lune et étoile réunies sur ce porte-clés poétique et raffiné.",
		typeSlug: "porte-cles",
		imageCategory: "porteCles",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 2490,
				inventory: 30,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "argent-925", price: 2990, inventory: 25 },
		],
	},
	{
		slug: "porte-cles-trefle",
		title: "Porte-Clés Trèfle Chance",
		description: "Un trèfle à quatre feuilles pour porter chance au quotidien.",
		typeSlug: "porte-cles",
		imageCategory: "porteCles",
		collections: ["nouveautes", "best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 2290,
				inventory: 35,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 2290, inventory: 28 },
			{ colorSlug: "emeraude", materialSlug: "acier-inoxydable", price: 1990, inventory: 32 },
		],
	},
	{
		slug: "porte-cles-initiale",
		title: "Porte-Clés Initiale",
		description: "Personnalisez votre quotidien avec ce porte-clés à votre initiale.",
		typeSlug: "porte-cles",
		imageCategory: "porteCles",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				price: 1790,
				inventory: 50,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "acier-inoxydable", price: 1790, inventory: 45 },
		],
	},
	// COLLIERS SUPPLÉMENTAIRES (6)
	{
		slug: "collier-goutte-rosee",
		title: "Collier Goutte de Rosée",
		description: "Un pendentif en forme de goutte, symbole de pureté et de renouveau.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				price: 5490,
				inventory: 18,
				isDefault: true,
			},
			{ colorSlug: "emeraude", materialSlug: "cristal-swarovski", price: 5990, inventory: 12 },
			{ colorSlug: "or-blanc", materialSlug: "argent-925", price: 4990, inventory: 15 },
		],
	},
	{
		slug: "collier-infini-amour",
		title: "Collier Infini Amour",
		description: "Le symbole de l'infini pour un amour éternel, en plaqué or délicat.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["mariage", "best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 4490,
				inventory: 22,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 4490, inventory: 20 },
			{ colorSlug: "argent", materialSlug: "argent-925", price: 5290, inventory: 16 },
		],
	},
	{
		slug: "collier-etoile-polaire",
		title: "Collier Étoile Polaire",
		description: "Guidez votre chemin avec cette étoile scintillante au creux de votre cou.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["fetes", "nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 3990,
				inventory: 25,
				isDefault: true,
			},
			{ colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 5490, inventory: 14 },
		],
	},
	{
		slug: "collier-medaillon-vintage",
		title: "Collier Médaillon Vintage",
		description: "Un médaillon au charme rétro pour garder vos souvenirs près du cœur.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "laiton",
				price: 5990,
				inventory: 12,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "laiton", price: 5990, inventory: 10 },
		],
	},
	{
		slug: "collier-plume-legere",
		title: "Collier Plume Légère",
		description: "Une plume délicate symbolisant la liberté et la légèreté de l'être.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 3490,
				inventory: 28,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "argent-925", price: 4290, inventory: 22 },
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 3490, inventory: 25 },
		],
	},
	{
		slug: "collier-papillon-envol",
		title: "Collier Papillon en Vol",
		description: "Un papillon prêt à s'envoler, symbole de transformation et de beauté.",
		typeSlug: "colliers",
		imageCategory: "colliers",
		collections: ["fetes", "best-sellers"],
		skus: [
			{
				colorSlug: "or-rose",
				materialSlug: "plaque-or",
				price: 4790,
				inventory: 18,
				isDefault: true,
			},
			{ colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 6290, inventory: 10 },
		],
	},
	// BRACELETS SUPPLÉMENTAIRES (6)
	{
		slug: "bracelet-charm-coeurs",
		title: "Bracelet Charm Cœurs",
		description: "Un bracelet à breloques avec de petits cœurs pour un look romantique.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["nouveautes", "fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 3790,
				inventory: 20,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 3790, inventory: 18 },
			{ colorSlug: "argent", materialSlug: "argent-925", price: 4490, inventory: 15 },
		],
	},
	{
		slug: "bracelet-tennis-cristal",
		title: "Bracelet Tennis Cristal",
		description: "Une ligne de cristaux étincelants pour une élégance intemporelle.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["mariage", "fetes"],
		skus: [
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				price: 7990,
				inventory: 10,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "argent-925", price: 6990, inventory: 12 },
		],
	},
	{
		slug: "bracelet-maille-marine",
		title: "Bracelet Maille Marine",
		description: "Une maille marine robuste et élégante, inspirée de l'océan.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "argent",
				materialSlug: "acier-inoxydable",
				price: 2990,
				inventory: 30,
				isDefault: true,
			},
			{ colorSlug: "or-jaune", materialSlug: "acier-inoxydable", price: 2990, inventory: 28 },
		],
	},
	{
		slug: "bracelet-fil-soie",
		title: "Bracelet Fil de Soie",
		description: "Un fil de soie délicat orné d'une perle centrale, légèreté absolue.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["nouveautes", "best-sellers"],
		skus: [
			{
				colorSlug: "perle",
				materialSlug: "perles-naturelles",
				price: 2490,
				inventory: 35,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 2290, inventory: 30 },
		],
	},
	{
		slug: "bracelet-serpent-or",
		title: "Bracelet Serpent Doré",
		description: "Un bracelet serpent enroulé autour du poignet, mystère et séduction.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 5490,
				inventory: 12,
				isDefault: true,
			},
			{ colorSlug: "noir", materialSlug: "acier-inoxydable", price: 4990, inventory: 15 },
		],
	},
	{
		slug: "bracelet-noeud-infini",
		title: "Bracelet Nœud Infini",
		description: "Un nœud symbolisant l'infini, pour une amitié ou un amour éternel.",
		typeSlug: "bracelets",
		imageCategory: "bracelets",
		collections: ["best-sellers", "mariage"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 3290,
				inventory: 25,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 3290, inventory: 22 },
			{ colorSlug: "argent", materialSlug: "argent-925", price: 3990, inventory: 18 },
		],
	},
	// BAGUES SUPPLÉMENTAIRES (6)
	{
		slug: "bague-dome-lisse",
		title: "Bague Dôme Lisse",
		description: "Une bague dôme épurée au design minimaliste et moderne.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				size: "52",
				price: 2990,
				inventory: 20,
				isDefault: true,
			},
			{ colorSlug: "or-jaune", materialSlug: "plaque-or", size: "54", price: 2990, inventory: 18 },
			{ colorSlug: "argent", materialSlug: "argent-925", size: "52", price: 3490, inventory: 15 },
			{ colorSlug: "argent", materialSlug: "argent-925", size: "54", price: 3490, inventory: 14 },
		],
	},
	{
		slug: "bague-torsade-double",
		title: "Bague Torsade Double",
		description: "Deux fils torsadés s'entrelacent dans cette bague unique.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["nouveautes", "best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				size: "52",
				price: 3490,
				inventory: 16,
				isDefault: true,
			},
			{ colorSlug: "or-jaune", materialSlug: "plaque-or", size: "54", price: 3490, inventory: 18 },
			{ colorSlug: "or-rose", materialSlug: "plaque-or", size: "52", price: 3490, inventory: 14 },
			{ colorSlug: "or-rose", materialSlug: "plaque-or", size: "54", price: 3490, inventory: 15 },
		],
	},
	{
		slug: "bague-perle-solitaire",
		title: "Bague Perle Solitaire",
		description: "Une perle naturelle mise en valeur sur un anneau fin et délicat.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["mariage"],
		skus: [
			{
				colorSlug: "perle",
				materialSlug: "perles-naturelles",
				size: "52",
				price: 5990,
				inventory: 10,
				isDefault: true,
			},
			{
				colorSlug: "perle",
				materialSlug: "perles-naturelles",
				size: "54",
				price: 5990,
				inventory: 12,
			},
			{ colorSlug: "or-blanc", materialSlug: "argent-925", size: "54", price: 5490, inventory: 8 },
		],
	},
	{
		slug: "bague-triple-anneau",
		title: "Bague Triple Anneau",
		description: "Trois anneaux entrelacés pour un effet moderne et graphique.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				size: "54",
				price: 2790,
				inventory: 22,
				isDefault: true,
			},
			{
				colorSlug: "argent",
				materialSlug: "acier-inoxydable",
				size: "54",
				price: 2790,
				inventory: 20,
			},
			{
				colorSlug: "or-rose",
				materialSlug: "acier-inoxydable",
				size: "54",
				price: 2790,
				inventory: 18,
			},
		],
	},
	{
		slug: "bague-couronne-princesse",
		title: "Bague Couronne Princesse",
		description: "Une bague en forme de couronne pour les reines du quotidien.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["fetes", "best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				size: "52",
				price: 4290,
				inventory: 14,
				isDefault: true,
			},
			{ colorSlug: "or-jaune", materialSlug: "plaque-or", size: "54", price: 4290, inventory: 16 },
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				size: "52",
				price: 5490,
				inventory: 10,
			},
		],
	},
	{
		slug: "bague-vague-ocean",
		title: "Bague Vague Océan",
		description: "La forme d'une vague sculptée sur cet anneau inspiré par la mer.",
		typeSlug: "bagues",
		imageCategory: "bagues",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "argent",
				materialSlug: "argent-925",
				size: "52",
				price: 3990,
				inventory: 18,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "argent-925", size: "54", price: 3990, inventory: 16 },
			{ colorSlug: "or-blanc", materialSlug: "argent-925", size: "54", price: 4290, inventory: 12 },
		],
	},
	// CHAÎNES DE CORPS SUPPLÉMENTAIRES (3)
	{
		slug: "chaine-corps-etoiles",
		title: "Chaîne de Corps Étoiles",
		description: "Une constellation d'étoiles qui orne votre corps de lumière.",
		typeSlug: "chaines-corps",
		imageCategory: "chainesCorps",
		collections: ["fetes", "nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 7490,
				inventory: 8,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "acier-inoxydable", price: 6490, inventory: 10 },
		],
	},
	{
		slug: "chaine-corps-taille-fine",
		title: "Chaîne de Corps Taille Fine",
		description: "Une chaîne ultra-fine qui épouse délicatement vos courbes.",
		typeSlug: "chaines-corps",
		imageCategory: "chainesCorps",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				price: 4990,
				inventory: 15,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "acier-inoxydable", price: 4990, inventory: 12 },
		],
	},
	{
		slug: "chaine-corps-cristaux",
		title: "Chaîne de Corps Cristaux",
		description: "Des cristaux parsemés le long d'une chaîne pour briller de mille feux.",
		typeSlug: "chaines-corps",
		imageCategory: "chainesCorps",
		collections: ["mariage", "fetes"],
		skus: [
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				price: 9990,
				inventory: 6,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "argent-925", price: 8990, inventory: 8 },
		],
	},
	// PAPILLOUX SUPPLÉMENTAIRES (3)
	{
		slug: "papilloux-perle-delicate",
		title: "Papilloux Perle Délicate",
		description: "Des perles minuscules ornent ce papillon facial d'une grâce rare.",
		typeSlug: "papilloux",
		imageCategory: "papilloux",
		collections: ["mariage"],
		skus: [
			{
				colorSlug: "perle",
				materialSlug: "perles-naturelles",
				price: 4990,
				inventory: 12,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "perles-naturelles", price: 5490, inventory: 8 },
		],
	},
	{
		slug: "papilloux-argent-lune",
		title: "Papilloux Argent de Lune",
		description: "Un papillon argenté qui capture la lumière de la lune.",
		typeSlug: "papilloux",
		imageCategory: "papilloux",
		collections: ["fetes", "nouveautes"],
		skus: [
			{
				colorSlug: "argent",
				materialSlug: "argent-925",
				price: 4290,
				inventory: 18,
				isDefault: true,
			},
			{ colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 4990, inventory: 14 },
		],
	},
	{
		slug: "papilloux-duo-symetrie",
		title: "Papilloux Duo Symétrie",
		description: "Deux papillons symétriques pour un effet miroir captivant.",
		typeSlug: "papilloux",
		imageCategory: "papilloux",
		collections: ["nouveautes", "best-sellers"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 5990,
				inventory: 10,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 5990, inventory: 8 },
		],
	},
	// CHAÎNES DE CHEVEUX SUPPLÉMENTAIRES (4)
	{
		slug: "chaine-cheveux-cristaux",
		title: "Chaîne de Cheveux Cristaux",
		description: "Des cristaux scintillants tissés dans vos cheveux pour un éclat féerique.",
		typeSlug: "chaines-cheveux",
		imageCategory: "chainesCheveux",
		collections: ["mariage", "fetes"],
		skus: [
			{
				colorSlug: "cristal",
				materialSlug: "cristal-swarovski",
				price: 6990,
				inventory: 10,
				isDefault: true,
			},
			{ colorSlug: "or-blanc", materialSlug: "argent-925", price: 5990, inventory: 12 },
		],
	},
	{
		slug: "chaine-cheveux-feuilles",
		title: "Chaîne de Cheveux Feuilles",
		description: "Des feuilles dorées qui s'entrelacent dans votre chevelure.",
		typeSlug: "chaines-cheveux",
		imageCategory: "chainesCheveux",
		collections: ["nouveautes", "mariage"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 5490,
				inventory: 14,
				isDefault: true,
			},
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 5490, inventory: 12 },
		],
	},
	{
		slug: "chaine-cheveux-etoiles",
		title: "Chaîne de Cheveux Étoiles",
		description: "Une voie lactée de petites étoiles pour illuminer votre coiffure.",
		typeSlug: "chaines-cheveux",
		imageCategory: "chainesCheveux",
		collections: ["fetes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "acier-inoxydable",
				price: 3990,
				inventory: 20,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "acier-inoxydable", price: 3990, inventory: 18 },
		],
	},
	{
		slug: "chaine-cheveux-lune",
		title: "Chaîne de Cheveux Lune",
		description: "Un croissant de lune qui orne délicatement votre chevelure.",
		typeSlug: "chaines-cheveux",
		imageCategory: "chainesCheveux",
		collections: ["nouveautes"],
		skus: [
			{
				colorSlug: "or-jaune",
				materialSlug: "plaque-or",
				price: 4290,
				inventory: 16,
				isDefault: true,
			},
			{ colorSlug: "argent", materialSlug: "argent-925", price: 4790, inventory: 14 },
			{ colorSlug: "or-rose", materialSlug: "plaque-or", price: 4290, inventory: 15 },
		],
	},
];

// ============================================
// MAIN
// ============================================
async function main(): Promise<void> {
	console.log("🌱 Démarrage du seed...\n");

	await cleanup();

	// ============================================
	// COULEURS
	// ============================================
	await prisma.color.createMany({ data: colorsData });
	const colors = await prisma.color.findMany();
	const colorMap = new Map(colors.map((c) => [c.slug, c.id]));
	console.log(`✅ ${colors.length} couleurs créées`);

	// ============================================
	// MATÉRIAUX
	// ============================================
	await prisma.material.createMany({ data: materialsData });
	const materials = await prisma.material.findMany();
	const materialMap = new Map(materials.map((m) => [m.slug, m.id]));
	console.log(`✅ ${materials.length} matériaux créés`);

	// ============================================
	// TYPES DE PRODUITS
	// ============================================
	await prisma.productType.createMany({ data: productTypesData });
	const productTypes = await prisma.productType.findMany();
	const productTypeMap = new Map(productTypes.map((pt) => [pt.slug, pt.id]));
	console.log(`✅ ${productTypes.length} types de produits créés`);

	// ============================================
	// COLLECTIONS
	// ============================================
	await prisma.collection.createMany({ data: collectionsData });
	const collections = await prisma.collection.findMany();
	const collectionMap = new Map(collections.map((c) => [c.slug, c.id]));
	console.log(`✅ ${collections.length} collections créées`);

	// ============================================
	// PRODUITS AVEC SKUS ET IMAGES
	// ============================================
	const productMap = new Map<string, string>(); // slug → id

	for (let pIdx = 0; pIdx < productsData.length; pIdx++) {
		const productData = productsData[pIdx]!;
		const typeId = productTypeMap.get(productData.typeSlug);
		const images = jewelryImages[productData.imageCategory];

		const product = await prisma.product.create({
			data: {
				slug: productData.slug,
				title: productData.title,
				description: productData.description,
				// Last 2 products are DRAFT (M1: workflow brouillon→publication)
				status: pIdx >= productsData.length - 2 ? ProductStatus.DRAFT : ProductStatus.PUBLIC,
				typeId,
				skus: {
					create: productData.skus.map((skuData, index) => {
						// Short SKU code: first 3 chars of type + first 2 of color + index
						const typePrefix = productData.typeSlug.slice(0, 3).toUpperCase();
						const colorPrefix = skuData.colorSlug.replace(/-/g, "").slice(0, 2).toUpperCase();
						const productIndex = pIdx + 1;
						const skuCode = `${typePrefix}-${colorPrefix}-${productIndex.toString().padStart(2, "0")}${index + 1}`;
						const imageUrl = images[index % images.length]!;

						// 20% of SKUs get a compareAtPrice (strikethrough price)
						const compareAtPrice = sampleBoolean(0.2)
							? Math.round(
									skuData.price *
										(1 + faker.number.float({ min: 0.15, max: 0.3, fractionDigits: 2 })),
								)
							: null;

						return {
							sku: skuCode,
							// Couleurs M2M : une seule couleur seed (position 0 = principale).
							// Pour des bijoux bicolores, ajouter d'autres entries à position 1, 2…
							colors: {
								create: [
									{
										colorId: colorMap.get(skuData.colorSlug)!,
										position: 0,
									},
								],
							},
							// Matériaux M2M : un seul matériau seed (position 0 = principal).
							// Pour des bijoux bi-matière, ajouter d'autres entries à position 1, 2…
							materials: {
								create: [
									{
										materialId: materialMap.get(skuData.materialSlug)!,
										position: 0,
									},
								],
							},
							size: skuData.size ?? null,
							priceInclTax: skuData.price,
							compareAtPrice,
							inventory: skuData.inventory,
							isActive: true,
							isDefault: skuData.isDefault ?? false,
							images: {
								create: [
									{
										url: imageUrl,
										altText: `${productData.title} - ${skuData.colorSlug}`,
										mediaType: MediaType.IMAGE,
										isPrimary: true,
										// Static blur placeholder for ~50% of media (m1)
										blurDataUrl: sampleBoolean(0.5)
											? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAADklEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg=="
											: null,
									},
								],
							},
						};
					}),
				},
			},
		});

		productMap.set(productData.slug, product.id);
	}

	console.log(`✅ ${productsData.length} produits créés`);

	// Set 2 SKUs to inventory 0 (out-of-stock edge case)
	const skusToDeplete = await prisma.productSku.findMany({
		where: { isActive: true, inventory: { gt: 0 } },
		select: { id: true },
		take: 2,
		orderBy: { inventory: "asc" },
	});
	for (const sku of skusToDeplete) {
		await prisma.productSku.update({
			where: { id: sku.id },
			data: { inventory: 0 },
		});
	}
	console.log(`✅ ${skusToDeplete.length} SKUs mis à inventory 0 (rupture de stock)`);

	// ============================================
	// LIENS PRODUIT-COLLECTION (batch)
	// ============================================
	const productCollectionLinks: Prisma.ProductCollectionCreateManyInput[] = [];
	const featuredCollections = new Set<string>(); // Track which collections already have a featured product

	for (const productData of productsData) {
		const productId = productMap.get(productData.slug);
		if (!productId) continue;

		for (const collectionSlug of productData.collections) {
			const collectionId = collectionMap.get(collectionSlug);
			if (!collectionId) continue;

			// Only first product linked to each collection gets isFeatured
			const isFeatured = !featuredCollections.has(collectionId);
			if (isFeatured) featuredCollections.add(collectionId);

			productCollectionLinks.push({
				productId,
				collectionId,
				isFeatured,
			});
		}
	}

	await prisma.productCollection.createMany({ data: productCollectionLinks });
	console.log(`✅ ${productCollectionLinks.length} liens produit-collection créés`);

	// ============================================
	// UTILISATEURS
	// ============================================
	const adminUser = {
		id: faker.string.nanoid(12),
		role: "ADMIN" as const,
		name: "Admin Dev",
		email: CONFIG.adminEmail,
		emailVerified: true,
	} satisfies Prisma.UserCreateManyInput;

	const usersData = [
		adminUser,
		...Array.from({ length: CONFIG.userCount }).map((_, index) => {
			const firstName = faker.person.firstName();
			const lastName = faker.person.lastName();
			const fullName = `${firstName} ${lastName}`;
			const emailSlug = fullName
				.normalize("NFD")
				.replace(/\p{Diacritic}/gu, "")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, ".");

			const isVerified = sampleBoolean(0.7);
			return {
				id: faker.string.nanoid(12),
				role: index < 2 ? "ADMIN" : "USER",
				name: fullName,
				email: `${emailSlug}${index}@synclune.fr`,
				emailVerified: isVerified,
			} satisfies Prisma.UserCreateManyInput;
		}),
	];

	await prisma.user.createMany({ data: usersData });
	const verifiedUsers = usersData.filter((u) => u.emailVerified && u.role === "USER");
	console.log(`✅ ${usersData.length} utilisateurs créés`);

	// ============================================
	// COMPTES BETTER AUTH (credential accounts)
	// ============================================
	const accountsData: Prisma.AccountCreateManyInput[] = usersData.map((user) => ({
		id: faker.string.nanoid(12),
		accountId: user.id,
		providerId: "credential",
		userId: user.id,
		password: SEED_PASSWORD_HASH,
	}));

	await prisma.account.createMany({ data: accountsData });
	console.log(`✅ ${accountsData.length} comptes Better Auth créés (password: password123)`);

	// ============================================
	// COMMANDES (utilise les produits créés)
	// ============================================
	const existingProducts = await prisma.product.findMany({
		where: {
			status: "PUBLIC",
			skus: { some: { isActive: true, inventory: { gt: 0 } } },
		},
		include: {
			skus: {
				where: { isActive: true, inventory: { gt: 0 } },
				include: {
					colors: {
						select: { color: { select: { name: true } }, position: true },
						orderBy: { position: "asc" },
					},
					materials: {
						select: { material: { select: { name: true } }, position: true },
						orderBy: { position: "asc" },
					},
					images: {
						where: { isPrimary: true },
						select: { url: true },
						take: 1,
					},
				},
			},
			type: { select: { slug: true } },
		},
	});

	if (existingProducts.length === 0) {
		console.log("⚠️ Aucun produit PUBLIC avec stock trouvé. Pas de commandes créées.");
		return;
	}

	console.log(`📦 ${existingProducts.length} produits disponibles pour les commandes`);

	let ordersCreated = 0;
	const skuInventoryDecrements = new Map<string, number>();

	for (let i = 0; i < CONFIG.orderCount; i += 1) {
		// Pas de rattachement à un `User` : `Order.userId` a été droppée (audit
		// schéma V1, Lot C). Le parcours d'achat est 100 % invité — l'identité de
		// la cliente vit dans les colonnes figées `customerName`/`customerEmail`,
		// produites par `generateShippingAddress()` ci-dessous.
		const orderItemsCount = faker.number.int({ min: 1, max: 3 });
		const itemsData: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
		const usedSkuIds = new Set<string>();
		let subtotal = 0;

		for (let itemIndex = 0; itemIndex < orderItemsCount; itemIndex += 1) {
			const product = faker.helpers.arrayElement(existingProducts);
			const sku = faker.helpers.arrayElement(product.skus);

			// Prevent duplicate SKUs in the same order
			if (usedSkuIds.has(sku.id)) continue;
			usedSkuIds.add(sku.id);

			const quantity = faker.number.int({ min: 1, max: 2 });
			const lineAmount = sku.priceInclTax * quantity;
			subtotal += lineAmount;

			itemsData.push({
				skuId: sku.id,
				productTitle: product.title,
				productDescription: product.description,
				productImageUrl: sku.images[0]?.url ?? null,
				skuSku: sku.sku,
				skuColor: sku.colors.length > 0 ? sku.colors.map((c) => c.color.name).join(" · ") : null,
				skuMaterial: sku.materials[0]?.material.name ?? null,
				skuSize: sku.size ?? null,
				price: sku.priceInclTax,
				quantity,
			});
		}

		if (itemsData.length === 0) continue;

		const shippingData = generateShippingAddress();
		const shipping = getShippingCostForCountry(shippingData.shippingCountry);
		const total = subtotal + shipping;

		const status = faker.helpers.weightedArrayElement([
			{ weight: 2, value: OrderStatus.PENDING },
			{ weight: 3, value: OrderStatus.PROCESSING },
			{ weight: 4, value: OrderStatus.SHIPPED },
			{ weight: 8, value: OrderStatus.DELIVERED },
			{ weight: 1, value: OrderStatus.CANCELLED },
		]);

		// Cancelled orders: 60% were cancelled before payment (PENDING), 40% after (REFUNDED)
		// PENDING orders: ~20% FAILED, rest stay PENDING
		const paymentStatus =
			status === OrderStatus.CANCELLED
				? sampleBoolean(0.6)
					? PaymentStatus.PENDING
					: PaymentStatus.REFUNDED
				: status === OrderStatus.PENDING
					? faker.helpers.weightedArrayElement([
							{ weight: 80, value: PaymentStatus.PENDING },
							{ weight: 20, value: PaymentStatus.FAILED },
						])
					: PaymentStatus.PAID;

		const orderDate = randomRecentDate();

		// Stripe IDs (flow Elements : PaymentIntent uniquement). Les commandes PENDING
		// portent aussi un PaymentIntent (créé dès confirmCheckout, avant capture).
		const stripeIds =
			paymentStatus === PaymentStatus.PAID || paymentStatus === PaymentStatus.REFUNDED
				? {
						stripePaymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
					}
				: paymentStatus === PaymentStatus.PENDING
					? { stripePaymentIntentId: `pi_${faker.string.alphanumeric(24)}` }
					: {};

		let trackingData: Partial<Prisma.OrderCreateInput> = {};
		if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
			// Variable locale uniquement : `Order.shippingMethod` a été droppée
			// (audit schéma 2026-07-26). On garde la notion pour faire varier
			// l'estimation de livraison de façon réaliste dans le seed.
			const isExpress = sampleBoolean(0.3);

			const carrier = faker.helpers.weightedArrayElement([
				{ weight: 6, value: "colissimo" },
				{ weight: 2, value: "chronopost" },
				{ weight: 1, value: "mondial_relay" },
				{ weight: 1, value: "dpd" },
			]);

			const shippedAt = new Date(orderDate);
			shippedAt.setDate(shippedAt.getDate() + faker.number.int({ min: 1, max: 3 }));

			const estimatedDelivery = new Date(shippedAt);
			estimatedDelivery.setDate(
				estimatedDelivery.getDate() +
					(isExpress ? faker.number.int({ min: 1, max: 2 }) : faker.number.int({ min: 3, max: 7 })),
			);

			const trackingNum = faker.string.alphanumeric({ length: 13, casing: "upper" });
			const trackingUrls: Record<string, string> = {
				colissimo: `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNum}`,
				chronopost: `https://www.chronopost.fr/tracking-no-powerful/tracking-search/${trackingNum}`,
				mondial_relay: `https://www.mondialrelay.fr/suivi-de-colis?numero=${trackingNum}`,
				dpd: `https://trace.dpd.fr/fr/trace/${trackingNum}`,
			};

			trackingData = {
				shippingCarrier: carrier,
				trackingNumber: trackingNum,
				trackingUrl: trackingUrls[carrier],
				shippedAt,
				estimatedDelivery,
			};

			if (status === OrderStatus.DELIVERED) {
				const deliveredAt = new Date(shippedAt);
				deliveredAt.setDate(deliveredAt.getDate() + faker.number.int({ min: 2, max: 5 }));
				trackingData.actualDelivery = deliveredAt;
			}
		}

		await prisma.order.create({
			data: {
				orderNumber: buildOrderNumber(i + 1),
				subtotal,
				shippingCost: shipping,
				total,
				status,
				paymentStatus,
				...shippingData,
				...stripeIds,
				paidAt: paymentStatus === PaymentStatus.PAID ? orderDate : null,
				createdAt: orderDate,
				updatedAt: orderDate,
				...trackingData,
				items: {
					create: itemsData,
				},
			},
		});

		// Track inventory decrements for paid orders
		if (status !== OrderStatus.PENDING && status !== OrderStatus.CANCELLED) {
			for (const item of itemsData) {
				const current = skuInventoryDecrements.get(item.skuId) ?? 0;
				skuInventoryDecrements.set(item.skuId, current + item.quantity);
			}
		}

		ordersCreated++;
	}

	// Decrement inventory for SKUs sold in paid orders
	for (const [skuId, qty] of skuInventoryDecrements) {
		await prisma.productSku.update({
			where: { id: skuId },
			data: { inventory: { decrement: qty } },
		});
	}

	console.log(
		`✅ ${ordersCreated} commandes créées (${skuInventoryDecrements.size} SKUs stock mis à jour)`,
	);

	// ============================================
	// NUMÉROS DE FACTURE (Article 286 CGI)
	// ============================================
	const invoiceableOrders = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PAID,
			status: { in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
		},
		select: { id: true, createdAt: true },
		orderBy: { createdAt: "asc" },
	});

	const invoiceSeqByYear = new Map<number, number>();
	for (const order of invoiceableOrders) {
		const year = order.createdAt.getFullYear();
		const seq = (invoiceSeqByYear.get(year) ?? 0) + 1;
		invoiceSeqByYear.set(year, seq);
		const invoiceNumber = `F-${year}-${seq.toString().padStart(5, "0")}`;
		await prisma.order.update({
			where: { id: order.id },
			data: {
				invoiceNumber,
				invoiceStatus: "GENERATED",
				invoiceGeneratedAt: order.createdAt,
			},
		});
	}
	console.log(`✅ ${invoiceableOrders.length} numéros de facture assignés`);

	// ============================================
	// SESSIONS (batch)
	// ============================================
	const sessionsData: Prisma.SessionCreateManyInput[] = usersData.slice(0, 10).map((user) => ({
		id: faker.string.nanoid(12),
		userId: user.id,
		token: faker.string.alphanumeric({ length: 32 }),
		expiresAt: faker.date.future({ years: 0.1 }),
		ipAddress: faker.internet.ipv4(),
		userAgent: faker.internet.userAgent(),
	}));

	await prisma.session.createMany({ data: sessionsData });
	console.log(`✅ ${sessionsData.length} sessions créées`);

	// ============================================
	// CODES PROMO (DISCOUNT)
	// ============================================
	const currentYear = new Date().getFullYear();

	const pastDate = new Date();
	pastDate.setMonth(pastDate.getMonth() - 2);

	const futureDate = new Date();
	futureDate.setMonth(futureDate.getMonth() + 6);

	const discountsData: Prisma.DiscountCreateManyInput[] = [
		{
			code: "BIENVENUE10",
			type: DiscountType.PERCENTAGE,
			value: 10,
			isActive: true,
			endsAt: futureDate,
		},
		{
			code: "OFFRE5",
			type: DiscountType.FIXED_AMOUNT,
			value: 500,
			isActive: true,
			endsAt: futureDate,
		},
		{
			code: `ARCHIVE${currentYear - 1}`,
			type: DiscountType.PERCENTAGE,
			value: 15,
			isActive: false,
			endsAt: pastDate,
		},
		{
			code: "VIP20",
			type: DiscountType.PERCENTAGE,
			value: 20,
			isActive: true,
			maxUsageCount: 50,
			endsAt: futureDate,
		},
		{
			code: "PREMIERE",
			type: DiscountType.FIXED_AMOUNT,
			value: 1000,
			isActive: true,
			maxUsagePerUser: 1,
			endsAt: futureDate,
		},
		{
			code: "MINIMUM50",
			type: DiscountType.PERCENTAGE,
			value: 10,
			isActive: true,
			minOrderAmount: 5000,
			endsAt: futureDate,
		},
		{
			code: `ETE${currentYear}`,
			type: DiscountType.PERCENTAGE,
			value: 25,
			isActive: true,
			endsAt: futureDate,
		},
		{
			code: "FLASH30",
			type: DiscountType.PERCENTAGE,
			value: 30,
			isActive: true,
			maxUsageCount: 100,
			endsAt: futureDate,
		},
	];

	await prisma.discount.createMany({ data: discountsData });
	const discounts = await prisma.discount.findMany();
	console.log(`✅ ${discounts.length} codes promo créés`);

	// ============================================
	// UTILISATIONS CODES PROMO (batch)
	// ============================================
	// ⚠️ Le filtre `userId: { not: null }` qui vivait ici portait sur une colonne
	// `Order.userId` DROPPÉE au Lot C (2026-08-05) : `pnpm seed` aurait levé une
	// `PrismaClientValidationError`. Ni `tsc` ni le lint ne le voyaient — c'est
	// l'angle mort documenté dans CLAUDE.md (une clé inconnue dans un `select` ou un
	// `where` Prisma passe le typage). Le parcours est 100 % invité : il n'y a plus
	// de commande « rattachée à un compte » à filtrer.
	const paidOrders = await prisma.order.findMany({
		where: { paymentStatus: PaymentStatus.PAID },
		select: { id: true, subtotal: true, shippingCost: true },
		take: 25,
	});

	const activeDiscounts = discounts.filter((d) => d.isActive);
	const discountUsageCounts = new Map<string, number>();
	let discountedOrderCount = 0;

	// Le code promo vit maintenant EN COLONNES sur `Order` (audit V2, Lot 2) :
	// une seule écriture par commande, au lieu d'un `DiscountUsage.createMany`
	// suivi d'une passe de mise à jour des montants.
	for (const order of paidOrders) {
		if (!sampleBoolean(0.4)) continue;

		const discount = faker.helpers.arrayElement(activeDiscounts);
		const rawAmount =
			discount.type === DiscountType.PERCENTAGE
				? Math.round(order.subtotal * (discount.value / 100))
				: discount.value;
		const discountAmount = Math.min(rawAmount, order.subtotal);

		await prisma.order.update({
			where: { id: order.id },
			data: {
				discountId: discount.id,
				discountCode: discount.code,
				discountAmount,
				total: Math.max(0, order.subtotal - discountAmount + order.shippingCost),
			},
		});

		discountUsageCounts.set(discount.id, (discountUsageCounts.get(discount.id) ?? 0) + 1);
		discountedOrderCount++;
	}

	// Batch update discount usage counts
	for (const [discountId, count] of discountUsageCounts) {
		await prisma.discount.update({
			where: { id: discountId },
			data: { usageCount: { increment: count } },
		});
	}

	console.log(`✅ ${discountedOrderCount} utilisations de codes promo créées`);

	// ============================================
	// PANIERS — plus rien à semer
	// ============================================
	// Le panier vit dans le cookie `cart` de chaque navigateur depuis le
	// 2026-08-04 (comme les favoris depuis le 2026-08-03) : il n'y a plus de
	// tables `Cart`/`CartItem` à peupler. Pour tester un panier garni en local,
	// ajouter des articles depuis la boutique.

	// ============================================
	// REMBOURSEMENTS (REFUND + REFUND ITEM)
	// ============================================
	const refundableOrders = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PAID,
			status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] },
		},
		include: { items: true },
		take: 8,
	});

	const refundStatuses: RefundStatus[] = [
		RefundStatus.PENDING,
		RefundStatus.APPROVED,
		RefundStatus.COMPLETED,
		RefundStatus.COMPLETED,
		RefundStatus.FAILED,
		RefundStatus.CANCELLED,
	];

	const refundReasons: RefundReason[] = [
		RefundReason.CUSTOMER_REQUEST,
		RefundReason.DEFECTIVE,
		RefundReason.FRAUD,
		RefundReason.OTHER,
	];

	let refundsCreated = 0;
	for (let i = 0; i < Math.min(refundableOrders.length, 7); i++) {
		const order = refundableOrders[i]!;
		if (order.items.length === 0) continue;

		const refundStatus = refundStatuses[i % refundStatuses.length]!;
		const reason = faker.helpers.arrayElement(refundReasons);
		const isPartial = sampleBoolean(0.3);
		const itemsToRefund = isPartial ? [order.items[0]!] : order.items;
		// Cap refund amount to order total to avoid refund > total after discounts
		const rawRefundAmount = itemsToRefund.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0,
		);
		const refundAmount = Math.min(rawRefundAmount, order.total);

		const refundDate = new Date(order.createdAt);
		refundDate.setDate(refundDate.getDate() + faker.number.int({ min: 3, max: 14 }));

		try {
			await prisma.refund.create({
				data: {
					orderId: order.id,
					amount: refundAmount,
					reason,
					status: refundStatus,
					stripeRefundId:
						refundStatus === RefundStatus.COMPLETED ? `re_${faker.string.alphanumeric(24)}` : null,
					failureReason:
						refundStatus === RefundStatus.FAILED ? "Stripe refund failed: card_not_found" : null,
					note:
						reason === RefundReason.DEFECTIVE
							? "Fermoir cassé à la réception - photos reçues par email"
							: null,
					processedAt:
						refundStatus === RefundStatus.COMPLETED || refundStatus === RefundStatus.FAILED
							? refundDate
							: null,
					createdAt: refundDate,
					items: {
						create: (() => {
							// Distribute refund amount proportionally across items
							const totalItemsValue = itemsToRefund.reduce(
								(sum, item) => sum + item.price * item.quantity,
								0,
							);
							let remaining = refundAmount;
							return itemsToRefund.map((item, idx) => {
								const itemValue = item.price * item.quantity;
								const amount =
									idx === itemsToRefund.length - 1
										? remaining
										: Math.round((itemValue / totalItemsValue) * refundAmount);
								remaining -= amount;
								return {
									orderItemId: item.id,
									quantity: item.quantity,
									amount,
								};
							});
						})(),
					},
				},
			});

			// Set PARTIALLY_REFUNDED for partial completed refunds
			if (refundStatus === RefundStatus.COMPLETED && isPartial) {
				await prisma.order.update({
					where: { id: order.id },
					data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
				});
			}

			refundsCreated++;
		} catch (error) {
			logError("refund", error);
		}
	}
	// Refunds for cancelled orders with REFUNDED payment status (C1 fix)
	const cancelledRefundedOrders = await prisma.order.findMany({
		where: {
			status: OrderStatus.CANCELLED,
			paymentStatus: PaymentStatus.REFUNDED,
		},
		include: { items: true },
	});

	for (const order of cancelledRefundedOrders) {
		if (order.items.length === 0) continue;
		// Use order.total to avoid refund > total after discounts
		const refundAmount = order.total;
		const refundDate = new Date(order.createdAt);
		refundDate.setHours(refundDate.getHours() + faker.number.int({ min: 1, max: 48 }));

		try {
			await prisma.refund.create({
				data: {
					orderId: order.id,
					amount: refundAmount,
					reason: RefundReason.CUSTOMER_REQUEST,
					status: RefundStatus.COMPLETED,
					stripeRefundId: `re_${faker.string.alphanumeric(24)}`,
					note: "Remboursement suite à annulation de commande",
					processedAt: refundDate,
					createdAt: refundDate,
					items: {
						create: (() => {
							const totalItemsValue = order.items.reduce(
								(sum, item) => sum + item.price * item.quantity,
								0,
							);
							let remaining = refundAmount;
							return order.items.map((item, idx) => {
								const itemValue = item.price * item.quantity;
								const amount =
									idx === order.items.length - 1
										? remaining
										: Math.round((itemValue / totalItemsValue) * refundAmount);
								remaining -= amount;
								return {
									orderItemId: item.id,
									quantity: item.quantity,
									amount,
								};
							});
						})(),
					},
				},
			});
			refundsCreated++;
		} catch (error) {
			logError("refund-cancelled", error);
		}
	}

	console.log(
		`✅ ${refundsCreated} remboursements créés (dont ${cancelledRefundedOrders.length} pour commandes annulées)`,
	);

	// ============================================
	// HISTORIQUE DES COMMANDES (batch)
	// ============================================
	const adminUsers = usersData.filter((u) => u.role === "ADMIN");

	const allOrders = await prisma.order.findMany({
		select: {
			id: true,
			status: true,
			paymentStatus: true,
			createdAt: true,
		},
	});

	const allHistoryEntries: Prisma.OrderHistoryCreateManyInput[] = [];
	const clampToNow = (date: Date) => new Date(Math.min(date.getTime(), Date.now()));

	for (const order of allOrders) {
		let currentDate = new Date(order.createdAt);

		// 1. Creation
		allHistoryEntries.push({
			orderId: order.id,
			action: OrderAction.CREATED,
			newStatus: OrderStatus.PENDING,
			newPaymentStatus: PaymentStatus.PENDING,
			source: HistorySource.SYSTEM,
			createdAt: currentDate,
		});

		// 2. Payment (only for orders that actually got paid, not FAILED)
		if (
			order.paymentStatus === PaymentStatus.PAID ||
			order.paymentStatus === PaymentStatus.REFUNDED ||
			order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
		) {
			currentDate = clampToNow(new Date(currentDate));
			currentDate.setMinutes(currentDate.getMinutes() + faker.number.int({ min: 5, max: 30 }));
			currentDate = clampToNow(currentDate);
			allHistoryEntries.push({
				orderId: order.id,
				action: OrderAction.PAID,
				previousPaymentStatus: PaymentStatus.PENDING,
				newPaymentStatus: PaymentStatus.PAID,
				source: HistorySource.WEBHOOK,
				createdAt: currentDate,
			});
		}

		// 3. Processing
		if (
			(
				[OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] as OrderStatus[]
			).includes(order.status)
		) {
			currentDate = clampToNow(new Date(currentDate));
			currentDate.setHours(currentDate.getHours() + faker.number.int({ min: 1, max: 24 }));
			currentDate = clampToNow(currentDate);
			allHistoryEntries.push({
				orderId: order.id,
				action: OrderAction.PROCESSING,
				previousStatus: OrderStatus.PENDING,
				newStatus: OrderStatus.PROCESSING,
				authorName: faker.helpers.arrayElement(adminUsers).name,
				source: HistorySource.ADMIN,
				createdAt: currentDate,
			});
		}

		// 4. Shipped
		if (([OrderStatus.SHIPPED, OrderStatus.DELIVERED] as OrderStatus[]).includes(order.status)) {
			currentDate = clampToNow(new Date(currentDate));
			currentDate.setDate(currentDate.getDate() + faker.number.int({ min: 1, max: 3 }));
			currentDate = clampToNow(currentDate);
			allHistoryEntries.push({
				orderId: order.id,
				action: OrderAction.SHIPPED,
				previousStatus: OrderStatus.PROCESSING,
				newStatus: OrderStatus.SHIPPED,
				authorName: faker.helpers.arrayElement(adminUsers).name,
				source: HistorySource.ADMIN,
				createdAt: currentDate,
			});
		}

		// 5. Delivered
		if (order.status === OrderStatus.DELIVERED) {
			currentDate = clampToNow(new Date(currentDate));
			currentDate.setDate(currentDate.getDate() + faker.number.int({ min: 2, max: 5 }));
			currentDate = clampToNow(currentDate);
			allHistoryEntries.push({
				orderId: order.id,
				action: OrderAction.DELIVERED,
				previousStatus: OrderStatus.SHIPPED,
				newStatus: OrderStatus.DELIVERED,
				source: HistorySource.SYSTEM,
				createdAt: currentDate,
			});
		}

		// 6. Cancelled
		if (order.status === OrderStatus.CANCELLED) {
			currentDate = clampToNow(new Date(currentDate));
			currentDate.setHours(currentDate.getHours() + faker.number.int({ min: 1, max: 48 }));
			currentDate = clampToNow(currentDate);
			allHistoryEntries.push({
				orderId: order.id,
				action: OrderAction.CANCELLED,
				previousStatus: OrderStatus.PENDING,
				newStatus: OrderStatus.CANCELLED,
				note: "Annulation à la demande du client",
				authorName: faker.helpers.arrayElement(adminUsers).name,
				source: HistorySource.ADMIN,
				createdAt: currentDate,
			});
		}
	}

	// Additional history entries for missing OrderAction coverage
	const deliveredForHistory = allOrders.filter((o) => o.status === OrderStatus.DELIVERED);
	const shippedForHistory = allOrders.filter((o) => o.status === OrderStatus.SHIPPED);

	// RETURNED - a delivered order returned by customer
	if (deliveredForHistory[0]) {
		const returnDate = new Date(deliveredForHistory[0].createdAt);
		returnDate.setDate(returnDate.getDate() + 20);
		allHistoryEntries.push({
			orderId: deliveredForHistory[0].id,
			action: OrderAction.RETURNED,
			previousStatus: OrderStatus.DELIVERED,
			newStatus: OrderStatus.RETURNED,
			note: "Retour client - produit non conforme aux attentes",
			source: HistorySource.CUSTOMER,
			createdAt: returnDate,
		});
	}

	// TRACKING_UPDATED - tracking number changed
	if (shippedForHistory[0]) {
		const trackDate = new Date(shippedForHistory[0].createdAt);
		trackDate.setDate(trackDate.getDate() + 3);
		allHistoryEntries.push({
			orderId: shippedForHistory[0].id,
			action: OrderAction.TRACKING_UPDATED,
			note: "Numéro de suivi mis à jour : 6A12345678901",
			authorName: faker.helpers.arrayElement(adminUsers).name,
			source: HistorySource.ADMIN,
			createdAt: trackDate,
		});
	}

	// ADDRESS_UPDATED - shipping address changed before shipment
	if (deliveredForHistory[1]) {
		const addrDate = new Date(deliveredForHistory[1].createdAt);
		addrDate.setDate(addrDate.getDate() + 1);
		allHistoryEntries.push({
			orderId: deliveredForHistory[1].id,
			action: OrderAction.ADDRESS_UPDATED,
			note: "Adresse de livraison modifiée par le client",
			source: HistorySource.CUSTOMER,
			createdAt: addrDate,
		});
	}

	// INVOICE_GENERATED
	if (deliveredForHistory[2]) {
		const invDate = new Date(deliveredForHistory[2].createdAt);
		invDate.setDate(invDate.getDate() + 2);
		allHistoryEntries.push({
			orderId: deliveredForHistory[2].id,
			action: OrderAction.INVOICE_GENERATED,
			note: "Facture générée automatiquement",
			source: HistorySource.SYSTEM,
			createdAt: invDate,
		});
	}

	// REFUND_CREATED, REFUND_COMPLETED, REFUND_FAILED
	if (deliveredForHistory[3]) {
		const refDate = new Date(deliveredForHistory[3].createdAt);
		refDate.setDate(refDate.getDate() + 10);
		allHistoryEntries.push({
			orderId: deliveredForHistory[3].id,
			action: OrderAction.REFUND_CREATED,
			note: "Remboursement demandé par le client",
			authorName: faker.helpers.arrayElement(adminUsers).name,
			source: HistorySource.ADMIN,
			createdAt: refDate,
		});
		const completedDate = new Date(refDate);
		completedDate.setDate(completedDate.getDate() + 2);
		allHistoryEntries.push({
			orderId: deliveredForHistory[3].id,
			action: OrderAction.REFUND_COMPLETED,
			note: "Remboursement confirmé par Stripe",
			source: HistorySource.WEBHOOK,
			createdAt: completedDate,
		});
	}
	if (deliveredForHistory[4]) {
		const failDate = new Date(deliveredForHistory[4].createdAt);
		failDate.setDate(failDate.getDate() + 12);
		allHistoryEntries.push({
			orderId: deliveredForHistory[4].id,
			action: OrderAction.REFUND_FAILED,
			note: "Échec du remboursement Stripe : carte expirée",
			source: HistorySource.WEBHOOK,
			createdAt: failDate,
		});
	}

	// DISPUTE_OPENED, DISPUTE_RESOLVED
	if (deliveredForHistory[5]) {
		const dispDate = new Date(deliveredForHistory[5].createdAt);
		dispDate.setDate(dispDate.getDate() + 15);
		allHistoryEntries.push({
			orderId: deliveredForHistory[5].id,
			action: OrderAction.DISPUTE_OPENED,
			note: "Litige ouvert par le titulaire de la carte",
			source: HistorySource.WEBHOOK,
			createdAt: dispDate,
		});
		const resolvedDate = new Date(dispDate);
		resolvedDate.setDate(resolvedDate.getDate() + 30);
		allHistoryEntries.push({
			orderId: deliveredForHistory[5].id,
			action: OrderAction.DISPUTE_RESOLVED,
			note: "Litige résolu en faveur du marchand",
			source: HistorySource.WEBHOOK,
			createdAt: resolvedDate,
		});
	}

	// STATUS_REVERTED - an order status was reverted
	if (shippedForHistory[1]) {
		const revertDate = new Date(shippedForHistory[1].createdAt);
		revertDate.setDate(revertDate.getDate() + 2);
		allHistoryEntries.push({
			orderId: shippedForHistory[1].id,
			action: OrderAction.STATUS_REVERTED,
			previousStatus: OrderStatus.SHIPPED,
			newStatus: OrderStatus.PROCESSING,
			note: "Statut rétabli - erreur d'expédition",
			authorName: faker.helpers.arrayElement(adminUsers).name,
			source: HistorySource.ADMIN,
			createdAt: revertDate,
		});
	}

	// INVOICE_VOIDED - invoice voided after cancellation
	const cancelledOrders = allOrders.filter((o) => o.status === OrderStatus.CANCELLED);
	if (cancelledOrders[0]) {
		const voidDate = new Date(cancelledOrders[0].createdAt);
		voidDate.setDate(voidDate.getDate() + 3);
		allHistoryEntries.push({
			orderId: cancelledOrders[0].id,
			action: OrderAction.INVOICE_VOIDED,
			note: "Facture annulée suite à l'annulation de la commande",
			source: HistorySource.SYSTEM,
			createdAt: voidDate,
		});
	}

	await prisma.orderHistory.createMany({ data: allHistoryEntries });
	console.log(`✅ ${allHistoryEntries.length} entrées d'historique de commandes créées`);

	// Plus de seed de notes de commande : le modèle `OrderNote` a été retiré
	// (2026-08-05). La trace opérationnelle d'une commande vit dans `OrderHistory`,
	// dont le champ `note` est désormais la seule surface de texte libre.

	// Plus de seed wishlist : les favoris vivent dans le cookie `wishlist` de
	// chaque navigateur (retrait des tables Wishlist/WishlistItem, 2026-08-03).

	// ============================================
	// WEBHOOK EVENTS (enriched with order data)
	// ============================================
	const ordersForWebhooks = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PAID,
			stripePaymentIntentId: { not: null },
		},
		select: {
			createdAt: true,
		},
		take: 8,
	});

	const webhookEventsData: Prisma.WebhookEventCreateManyInput[] = [];

	for (const order of ordersForWebhooks) {
		const receivedAt = new Date(order.createdAt);
		receivedAt.setMinutes(receivedAt.getMinutes() + faker.number.int({ min: 1, max: 10 }));

		// checkout.session.completed
		webhookEventsData.push({
			stripeEventId: `evt_${faker.string.alphanumeric(24)}`,
			eventType: "checkout.session.completed",
			status: WebhookEventStatus.COMPLETED,
			attempts: 1,
			receivedAt,
			processedAt: receivedAt,
		});

		// payment_intent.succeeded
		webhookEventsData.push({
			stripeEventId: `evt_${faker.string.alphanumeric(24)}`,
			eventType: "payment_intent.succeeded",
			status: WebhookEventStatus.COMPLETED,
			attempts: 1,
			receivedAt,
			processedAt: receivedAt,
		});
	}

	// Add a failed event for realism
	webhookEventsData.push({
		stripeEventId: `evt_${faker.string.alphanumeric(24)}`,
		eventType: "payment_intent.failed",
		status: WebhookEventStatus.FAILED,
		attempts: 3,
		receivedAt: faker.date.recent({ days: 30 }),
		processedAt: faker.date.recent({ days: 30 }),
	});

	// Add a skipped event
	webhookEventsData.push({
		stripeEventId: `evt_${faker.string.alphanumeric(24)}`,
		eventType: "charge.refunded",
		status: WebhookEventStatus.SKIPPED,
		attempts: 1,
		receivedAt: faker.date.recent({ days: 15 }),
		processedAt: faker.date.recent({ days: 15 }),
	});

	// Add PROCESSING event (stuck mid-processing)
	webhookEventsData.push({
		stripeEventId: `evt_${faker.string.alphanumeric(24)}`,
		eventType: "checkout.session.completed",
		status: WebhookEventStatus.PROCESSING,
		attempts: 1,
		receivedAt: faker.date.recent({ days: 1 }),
	});

	await prisma.webhookEvent.createMany({ data: webhookEventsData });
	console.log(`✅ ${webhookEventsData.length} événements webhook créés`);

	// ============================================
	// VERIFICATION TOKENS (missing model)
	// ============================================
	const verificationData: Prisma.VerificationCreateManyInput[] = [
		{
			id: faker.string.nanoid(12),
			identifier: "email-verification",
			value: faker.string.alphanumeric(64),
			expiresAt: faker.date.future({ years: 0.01 }),
		},
		{
			id: faker.string.nanoid(12),
			identifier: "password-reset",
			value: faker.string.alphanumeric(64),
			expiresAt: faker.date.future({ years: 0.01 }),
		},
		{
			id: faker.string.nanoid(12),
			identifier: "expired-token",
			value: faker.string.alphanumeric(64),
			expiresAt: faker.date.past({ years: 0.01 }),
		},
	];
	await prisma.verification.createMany({ data: verificationData });
	console.log(`✅ ${verificationData.length} tokens de vérification créés`);

	// ============================================
	// EDGE CASE USERS (suspended, pending deletion, anonymized)
	// ============================================
	const edgeCaseUsers = verifiedUsers.slice(-3);
	if (edgeCaseUsers.length >= 3) {
		// Suspended user
		await prisma.user.update({
			where: { id: edgeCaseUsers[0]!.id },
			data: { suspendedAt: faker.date.recent({ days: 7 }) },
		});

		// Compte verrouillé hérité — `PENDING_DELETION` a été purgé au Lot 0 (migration
		// 20260803) ; `INACTIVE` couvre la même dégradation de session (cf. `customSession`).
		await prisma.user.update({
			where: { id: edgeCaseUsers[1]!.id },
			data: { accountStatus: AccountStatus.INACTIVE },
		});

		// Anonymized user — idem pour `anonymizedAt`. Le scrub du nom et de l'email
		// reste représenté, c'est lui que les gardes de connexion observent.
		await prisma.user.update({
			where: { id: edgeCaseUsers[2]!.id },
			data: {
				accountStatus: AccountStatus.ANONYMIZED,
				name: "Utilisateur anonymisé",
				email: `anonymized-${faker.string.alphanumeric(8)}@anon.synclune.fr`,
			},
		});

		console.log("✅ 3 utilisateurs edge-case créés (suspendu, suppression en attente, anonymisé)");
	}

	// ============================================
	// EDGE CASE DISCOUNTS (maxed usage, manually deactivated)
	// ============================================
	const edgeCaseDiscounts: Prisma.DiscountCreateManyInput[] = [
		{
			code: "MAXED_OUT",
			type: DiscountType.PERCENTAGE,
			value: 15,
			isActive: true,
			maxUsageCount: 10,
			usageCount: 10,
			endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		},
		{
			code: "ADMIN_DISABLED",
			type: DiscountType.PERCENTAGE,
			value: 20,
			isActive: true,
			endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		},
	];
	await prisma.discount.createMany({ data: edgeCaseDiscounts });
	console.log(`✅ ${edgeCaseDiscounts.length} codes promo edge-case créés`);

	// ============================================
	// SOFT-DELETED RECORDS (for testing filters)
	// ============================================
	const deletedAt = new Date();
	deletedAt.setDate(deletedAt.getDate() - 15);

	// Soft-delete 2 products
	const productsToSoftDelete = await prisma.product.findMany({
		where: { status: ProductStatus.PUBLIC, deletedAt: null },
		select: { id: true },
		take: 2,
		orderBy: { createdAt: "desc" },
	});
	for (const p of productsToSoftDelete) {
		await prisma.product.update({
			where: { id: p.id },
			data: { deletedAt, status: ProductStatus.ARCHIVED },
		});
	}

	// Soft-delete 2 orders
	const ordersToSoftDelete = await prisma.order.findMany({
		where: { deletedAt: null, status: OrderStatus.CANCELLED },
		select: { id: true },
		take: 2,
	});
	for (const o of ordersToSoftDelete) {
		await prisma.order.update({
			where: { id: o.id },
			data: { deletedAt },
		});
	}

	console.log(
		`✅ Records soft-deleted: ${productsToSoftDelete.length} produits, ${ordersToSoftDelete.length} commandes`,
	);

	// ============================================
	// STORE SETTINGS (SINGLETON)
	// ============================================
	await prisma.storeSettings.upsert({
		where: { id: "store-settings-singleton" },
		update: {},
		create: { id: "store-settings-singleton", isClosed: false },
	});
	console.log("✅ Store settings singleton created");

	console.log("\n🎉 Seed terminé avec succès!");
}

main()
	.catch((error) => {
		console.error("❌ Erreur lors du seed:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
