import { scryptSync } from "node:crypto";
import { fakerFR } from "@faker-js/faker";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
	CollectionStatus,
	CustomizationRequestStatus,
	DiscountType,
	FulfillmentStatus,
	MediaType,
	NewsletterStatus,
	OrderAction,
	OrderStatus,
	PaymentStatus,
	type Prisma,
	PrismaClient,
	ProductStatus,
	RefundReason,
	RefundStatus,
	ReviewStatus,
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
		customerPhone: phone,
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
		console.log("⏭️  Cleanup skipped (SEED_CLEANUP=false)");
		return;
	}

	console.log("🧹 Nettoyage de la base de données...");

	await prisma.auditLog.deleteMany();
	await prisma.dispute.deleteMany();
	await prisma.failedEmail.deleteMany();
	await prisma.testimonial.deleteMany();
	await prisma.customizationMedia.deleteMany();

	await prisma.reviewMedia.deleteMany();
	await prisma.reviewResponse.deleteMany();
	await prisma.productReview.deleteMany();
	await prisma.productReviewStats.deleteMany();

	await prisma.orderHistory.deleteMany();
	await prisma.orderNote.deleteMany();
	await prisma.refundItem.deleteMany();
	await prisma.refund.deleteMany();
	await prisma.discountUsage.deleteMany();
	await prisma.orderItem.deleteMany();
	await prisma.order.deleteMany();

	await prisma.cartItem.deleteMany();
	await prisma.cart.deleteMany();
	await prisma.wishlistItem.deleteMany();
	await prisma.wishlist.deleteMany();

	await prisma.webhookEvent.deleteMany();
	await prisma.customizationRequest.deleteMany();
	await prisma.newsletterSubscriber.deleteMany();
	await prisma.discount.deleteMany();

	await prisma.address.deleteMany();
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
							colorId: colorMap.get(skuData.colorSlug)!,
							materialId: materialMap.get(skuData.materialSlug)!,
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
				termsAcceptedAt: isVerified && sampleBoolean(0.7) ? faker.date.past({ years: 0.5 }) : null,
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
					color: { select: { name: true } },
					material: { select: { name: true } },
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

	// Pre-generate one Stripe customer ID per user for consistency
	const userStripeCustomerMap = new Map<string, string>();
	for (const user of usersData) {
		userStripeCustomerMap.set(user.id, `cus_${faker.string.alphanumeric(14)}`);
	}

	for (let i = 0; i < CONFIG.orderCount; i += 1) {
		const customer = sampleBoolean(0.85) ? faker.helpers.arrayElement(usersData) : null;
		const customerId = customer?.id ?? null;
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
				productId: product.id,
				skuId: sku.id,
				productTitle: product.title,
				productDescription: product.description,
				productImageUrl: sku.images[0]?.url ?? null,
				skuSku: sku.sku,
				skuColor: sku.color?.name ?? null,
				skuMaterial: sku.material?.name ?? null,
				skuSize: sku.size ?? null,
				skuImageUrl: sku.images[0]?.url ?? null,
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
		// PENDING orders: ~15% FAILED, ~10% EXPIRED, rest stay PENDING
		const paymentStatus =
			status === OrderStatus.CANCELLED
				? sampleBoolean(0.6)
					? PaymentStatus.PENDING
					: PaymentStatus.REFUNDED
				: status === OrderStatus.PENDING
					? faker.helpers.weightedArrayElement([
							{ weight: 75, value: PaymentStatus.PENDING },
							{ weight: 15, value: PaymentStatus.FAILED },
							{ weight: 10, value: PaymentStatus.EXPIRED },
						])
					: PaymentStatus.PAID;

		// Payment failure details for FAILED orders
		const paymentFailureData =
			paymentStatus === PaymentStatus.FAILED
				? {
						paymentFailureCode: faker.helpers.arrayElement([
							"card_declined",
							"expired_card",
							"insufficient_funds",
							"processing_error",
						]),
						paymentDeclineCode: faker.helpers.arrayElement([
							"generic_decline",
							"insufficient_funds",
							"lost_card",
							"stolen_card",
							null,
						]),
						paymentFailureMessage: faker.helpers.arrayElement([
							"Your card was declined.",
							"Your card has expired.",
							"Your card has insufficient funds.",
							"An error occurred while processing your card.",
						]),
					}
				: {};

		let fulfillmentStatus: FulfillmentStatus = FulfillmentStatus.UNFULFILLED;
		if (status === OrderStatus.SHIPPED) {
			fulfillmentStatus = FulfillmentStatus.SHIPPED;
		} else if (status === OrderStatus.DELIVERED) {
			fulfillmentStatus = FulfillmentStatus.DELIVERED;
		} else if (status === OrderStatus.PROCESSING) {
			fulfillmentStatus = sampleBoolean(0.5)
				? FulfillmentStatus.PROCESSING
				: FulfillmentStatus.UNFULFILLED;
		}

		const orderDate = randomRecentDate();

		// Stripe IDs for paid/refunded orders + checkout session for pending
		const stripeIds =
			paymentStatus === PaymentStatus.PAID || paymentStatus === PaymentStatus.REFUNDED
				? {
						stripeCheckoutSessionId: `cs_test_${faker.string.alphanumeric(24)}`,
						stripePaymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
						stripeCustomerId: customerId ? userStripeCustomerMap.get(customerId)! : null,
						stripeInvoiceId: sampleBoolean(0.3) ? `in_${faker.string.alphanumeric(24)}` : null,
					}
				: paymentStatus === PaymentStatus.PENDING
					? { stripeCheckoutSessionId: `cs_test_${faker.string.alphanumeric(24)}` }
					: {};

		// Post-delivery email tracking for delivered orders
		const emailTrackingData: Partial<Prisma.OrderCreateInput> = {};
		if (status === OrderStatus.DELIVERED) {
			if (sampleBoolean(0.6)) {
				emailTrackingData.reviewRequestSentAt = new Date(
					orderDate.getTime() + 14 * 24 * 60 * 60 * 1000,
				);
			}
			if (sampleBoolean(0.3)) {
				emailTrackingData.reviewReminderSentAt = new Date(
					orderDate.getTime() + 21 * 24 * 60 * 60 * 1000,
				);
			}
			if (sampleBoolean(0.4)) {
				emailTrackingData.crossSellEmailSentAt = new Date(
					orderDate.getTime() + 30 * 24 * 60 * 60 * 1000,
				);
			}
		}

		let trackingData: Partial<Prisma.OrderCreateInput> = {};
		if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
			const shippingMethod = faker.helpers.weightedArrayElement([
				{ weight: 6, value: "STANDARD" },
				{ weight: 3, value: "EXPRESS" },
				{ weight: 1, value: "POINT_RELAIS" },
			]);

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
					(shippingMethod === "EXPRESS"
						? faker.number.int({ min: 1, max: 2 })
						: faker.number.int({ min: 3, max: 7 })),
			);

			const trackingNum = faker.string.alphanumeric({ length: 13, casing: "upper" });
			const trackingUrls: Record<string, string> = {
				colissimo: `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNum}`,
				chronopost: `https://www.chronopost.fr/tracking-no-powerful/tracking-search/${trackingNum}`,
				mondial_relay: `https://www.mondialrelay.fr/suivi-de-colis?numero=${trackingNum}`,
				dpd: `https://trace.dpd.fr/fr/trace/${trackingNum}`,
			};

			trackingData = {
				shippingMethod,
				shippingCarrier: carrier,
				shippingRateId: sampleBoolean(0.5) ? `shr_${faker.string.alphanumeric(24)}` : null,
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
				user: customerId ? { connect: { id: customerId } } : undefined,
				subtotal,
				shippingCost: shipping,
				taxAmount: 0,
				total,
				status,
				paymentStatus,
				fulfillmentStatus,
				...shippingData,
				...stripeIds,
				...paymentFailureData,
				paidAt: paymentStatus === PaymentStatus.PAID ? orderDate : null,
				createdAt: orderDate,
				updatedAt: orderDate,
				...trackingData,
				...emailTrackingData,
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

	// Update User.stripeCustomerId for users who have paid orders
	const usersWithPaidOrders = await prisma.order.findMany({
		where: { userId: { not: null }, paymentStatus: PaymentStatus.PAID },
		select: { userId: true, stripeCustomerId: true },
		distinct: ["userId"],
	});

	for (const order of usersWithPaidOrders) {
		if (order.userId && order.stripeCustomerId) {
			await prisma.user.update({
				where: { id: order.userId },
				data: { stripeCustomerId: order.stripeCustomerId },
			});
		}
	}

	console.log(`✅ ${usersWithPaidOrders.length} utilisateurs mis à jour avec stripeCustomerId`);

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
	// AVIS PRODUITS (REVIEWS) - batch
	// ============================================
	const reviewTitles = {
		positive: [
			"Absolument magnifique !",
			"Coup de cœur",
			"Qualité exceptionnelle",
			"Je recommande vivement",
			"Très satisfaite",
			"Sublime",
			"Parfait pour offrir",
			"Élégance au quotidien",
			"Un vrai bijou",
			"Superbe cadeau",
		],
		neutral: [
			"Correct dans l'ensemble",
			"Bien mais...",
			"Conforme à la description",
			"Satisfaisant",
		],
		negative: ["Déçue", "Pas à la hauteur", "Qualité décevante"],
	};

	const reviewContents = {
		positive: [
			"J'ai reçu ce bijou pour mon anniversaire et je suis absolument ravie ! La qualité est au rendez-vous, les finitions sont impeccables. Je le porte tous les jours.",
			"Commande reçue rapidement, emballage soigné. Le bijou est encore plus beau en vrai qu'en photo. Ma mère a adoré son cadeau !",
			"C'est mon troisième achat chez Synclune et je ne suis jamais déçue. Les bijoux sont délicats, féminins et de très bonne qualité. Bravo !",
			"Parfait pour un cadeau de mariage. Ma témoin était émue aux larmes. Un bijou qui a du sens et qui est magnifiquement réalisé.",
			"Je cherchais un bijou original et j'ai trouvé mon bonheur. Design unique, livraison rapide, je suis conquise !",
			"La chaîne est très délicate et s'accorde parfaitement avec mes tenues. Reçu dans un joli écrin, parfait pour offrir.",
			"Qualité irréprochable, le bijou ne ternit pas et reste brillant même après plusieurs semaines de port quotidien.",
			"J'ai craqué sur le design bohème et je ne regrette pas. C'est devenu mon bijou préféré, il attire toujours des compliments.",
			"Superbe réalisation artisanale. On sent le travail soigné et l'attention aux détails. Je recommande à 100%.",
			"Achat pour les fêtes, livraison express parfaitement respectée. Le bijou est sublime et le packaging très élégant.",
		],
		neutral: [
			"Le bijou est joli mais la chaîne est un peu plus fine que ce que j'imaginais. Reste un bon rapport qualité-prix.",
			"Conforme à la description, livraison dans les temps. Rien de négatif à signaler mais rien d'exceptionnel non plus.",
			"Le bijou est correct pour le prix. J'aurais aimé un emballage un peu plus soigné pour offrir.",
			"Belle couleur mais les finitions auraient pu être plus soignées. Globalement satisfaite.",
		],
		negative: [
			"Le bijou est joli mais la fermeture s'est abîmée après quelques utilisations. Dommage.",
			"La couleur est différente de ce que je voyais sur les photos. Un peu déçue mais le service client m'a bien accompagnée.",
			"Délai de livraison plus long que prévu. Le bijou est correct mais je m'attendais à mieux pour ce prix.",
		],
	};

	const deliveredOrders = await prisma.order.findMany({
		where: {
			status: OrderStatus.DELIVERED,
			userId: { not: null },
		},
		include: {
			items: {
				include: {
					product: true,
				},
			},
			user: true,
		},
	});

	console.log(`📝 ${deliveredOrders.length} commandes livrées trouvées pour les avis`);

	const reviewsData: Prisma.ProductReviewCreateManyInput[] = [];
	const reviewedPairs = new Set<string>();

	for (const order of deliveredOrders) {
		if (!order.userId || !order.user) continue;
		if (!sampleBoolean(0.7)) continue;

		for (const item of order.items) {
			if (!item.productId) continue;

			const pairKey = `${order.userId}-${item.productId}`;
			if (reviewedPairs.has(pairKey)) continue;
			if (!sampleBoolean(0.85)) continue;

			const rating = faker.helpers.weightedArrayElement([
				{ weight: 2, value: 5 },
				{ weight: 3, value: 4 },
				{ weight: 1, value: 3 },
				{ weight: 0.3, value: 2 },
				{ weight: 0.1, value: 1 },
			]);

			let titlePool: string[];
			let contentPool: string[];

			if (rating >= 4) {
				titlePool = reviewTitles.positive;
				contentPool = reviewContents.positive;
			} else if (rating === 3) {
				titlePool = reviewTitles.neutral;
				contentPool = reviewContents.neutral;
			} else {
				titlePool = reviewTitles.negative;
				contentPool = reviewContents.negative;
			}

			const hasTitle = sampleBoolean(0.7);
			const title = hasTitle ? faker.helpers.arrayElement(titlePool) : null;
			const content = faker.helpers.arrayElement(contentPool);

			const reviewDate = new Date(order.createdAt);
			reviewDate.setDate(reviewDate.getDate() + faker.number.int({ min: 1, max: 14 }));
			// Clamp to now to avoid future-dated reviews
			const now = new Date();
			if (reviewDate > now)
				reviewDate.setTime(now.getTime() - faker.number.int({ min: 1, max: 24 }) * 60 * 60 * 1000);

			const reviewStatus = sampleBoolean(0.95) ? ReviewStatus.PUBLISHED : ReviewStatus.HIDDEN;

			reviewsData.push({
				productId: item.productId,
				userId: order.userId,
				orderItemId: item.id,
				rating,
				title,
				content,
				status: reviewStatus,
				createdAt: reviewDate,
				updatedAt: reviewDate,
			});

			reviewedPairs.add(pairKey);
		}
	}

	await prisma.productReview.createMany({ data: reviewsData });
	console.log(`✅ ${reviewsData.length} avis créés`);

	// ============================================
	// RÉPONSES ADMIN AUX AVIS (batch)
	// ============================================
	const adminResponses = {
		positive: [
			"Merci infiniment pour ce retour chaleureux ! Votre satisfaction est notre plus belle récompense. Au plaisir de vous retrouver parmi nous. 💫",
			"Quel bonheur de lire votre commentaire ! Nous sommes ravies que ce bijou ait trouvé sa place dans votre quotidien. Merci pour votre confiance.",
			"Un immense merci pour ce témoignage ! Chaque bijou est créé avec amour et savoir-faire artisanal. Votre retour nous touche profondément.",
			"Merci pour ces mots si gentils ! Nous mettons tout notre cœur dans chaque création. Ravie que cela se ressente à travers nos bijoux.",
			"Votre avis nous fait chaud au cœur ! Merci de faire partie de l'aventure Synclune. À très bientôt pour de nouvelles découvertes.",
			"Merci beaucoup pour cette belle recommandation ! Nous sommes heureuses que notre travail artisanal vous plaise autant.",
			"Quel plaisir de vous compter parmi nos clientes fidèles ! Merci pour votre confiance renouvelée et ce magnifique retour.",
			"Merci pour ce retour enthousiaste ! Les compliments que vous recevez sont notre plus belle publicité. 🌟",
		],
		neutral: [
			"Merci pour votre retour honnête. Nous prenons note de vos remarques pour continuer à nous améliorer. N'hésitez pas à nous contacter si besoin.",
			"Merci d'avoir pris le temps de partager votre expérience. Vos suggestions nous aident à progresser. Notre équipe reste à votre disposition.",
			"Nous vous remercions pour cet avis. La satisfaction de nos clientes est primordiale. N'hésitez pas à nous écrire pour toute question.",
		],
		negative: [
			"Nous sommes sincèrement désolées de cette expérience. Votre satisfaction est notre priorité. Notre service client vous a contactée pour trouver une solution.",
			"Merci pour ce retour, même s'il nous attriste. Nous allons examiner ce point attentivement. N'hésitez pas à nous contacter directement à contact@synclune.fr.",
			"Nous regrettons que ce bijou n'ait pas répondu à vos attentes. Notre équipe se tient à votre disposition pour échanger et trouver une solution adaptée.",
		],
	};

	const reviewsForResponses = await prisma.productReview.findMany({
		where: {
			status: ReviewStatus.PUBLISHED,
			deletedAt: null,
		},
		select: {
			id: true,
			rating: true,
			createdAt: true,
		},
	});

	console.log(`💬 ${reviewsForResponses.length} avis publiés trouvés pour les réponses`);

	const responsesData: Prisma.ReviewResponseCreateManyInput[] = [];

	for (const review of reviewsForResponses) {
		if (!sampleBoolean(0.5)) continue;

		let responsePool: string[];
		if (review.rating >= 4) {
			responsePool = adminResponses.positive;
		} else if (review.rating === 3) {
			responsePool = adminResponses.neutral;
		} else {
			responsePool = adminResponses.negative;
		}

		const responseDate = new Date(review.createdAt);
		responseDate.setDate(responseDate.getDate() + faker.number.int({ min: 1, max: 7 }));

		responsesData.push({
			reviewId: review.id,
			content: faker.helpers.arrayElement(responsePool),
			authorId: adminUser.id,
			authorName: "L'équipe Synclune",
			createdAt: responseDate,
			updatedAt: responseDate,
		});
	}

	await prisma.reviewResponse.createMany({ data: responsesData });
	console.log(`✅ ${responsesData.length} réponses admin créées`);

	// ============================================
	// MISE À JOUR DES STATS DES REVIEWS
	// ============================================
	// Single groupBy query instead of N+1
	const allPublishedReviews = await prisma.productReview.findMany({
		where: { status: ReviewStatus.PUBLISHED, deletedAt: null },
		select: { productId: true, rating: true },
	});

	const reviewStatsByProduct = new Map<string, { ratings: number[] }>();
	for (const review of allPublishedReviews) {
		if (!review.productId) continue;
		let stats = reviewStatsByProduct.get(review.productId);
		if (!stats) {
			stats = { ratings: [] };
			reviewStatsByProduct.set(review.productId, stats);
		}
		stats.ratings.push(review.rating);
	}

	const reviewStatsData: Prisma.ProductReviewStatsCreateManyInput[] = [];
	for (const [productId, stats] of reviewStatsByProduct) {
		const totalCount = stats.ratings.length;
		const sumRatings = stats.ratings.reduce((sum, r) => sum + r, 0);
		const averageRating = totalCount > 0 ? sumRatings / totalCount : 0;

		const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
		for (const rating of stats.ratings) {
			ratingCounts[rating as keyof typeof ratingCounts]++;
		}

		reviewStatsData.push({
			productId,
			totalCount,
			averageRating,
			rating1Count: ratingCounts[1],
			rating2Count: ratingCounts[2],
			rating3Count: ratingCounts[3],
			rating4Count: ratingCounts[4],
			rating5Count: ratingCounts[5],
		});
	}

	await prisma.productReviewStats.createMany({ data: reviewStatsData });
	console.log(`✅ Stats des avis créées pour ${reviewStatsByProduct.size} produits`);

	// ============================================
	// ADRESSES UTILISATEURS (batch)
	// ============================================
	const usersWithOrders = await prisma.user.findMany({
		where: { orders: { some: {} } },
		select: { id: true, name: true },
		take: 15,
	});

	const addressesData: Prisma.AddressCreateManyInput[] = [];

	for (const user of usersWithOrders) {
		const firstName = user.name?.split(" ")[0] ?? faker.person.firstName();
		const lastName = user.name?.split(" ").slice(1).join(" ") ?? faker.person.lastName();

		// Default address (M9: mixed FR/EU countries)
		const defaultCountry = faker.helpers.weightedArrayElement(
			EU_COUNTRIES.map((c) => ({ weight: c.weight, value: c })),
		);
		addressesData.push({
			userId: user.id,
			firstName,
			lastName,
			address1: faker.location.streetAddress(),
			address2: sampleBoolean(0.3) ? faker.location.secondaryAddress() : null,
			postalCode: faker.location.zipCode(defaultCountry.zipFormat),
			city: faker.location.city(),
			country: defaultCountry.code,
			phone: faker.helpers.replaceSymbols(
				`${faker.helpers.arrayElement(defaultCountry.phonePrefixes)} ## ## ## ##`,
			),
			isDefault: true,
		});

		// 40% have a second address
		if (sampleBoolean(0.4)) {
			const secondCountry = faker.helpers.weightedArrayElement(
				EU_COUNTRIES.map((c) => ({ weight: c.weight, value: c })),
			);
			addressesData.push({
				userId: user.id,
				firstName,
				lastName,
				address1: faker.location.streetAddress(),
				address2: sampleBoolean(0.5) ? "Bureau " + faker.number.int({ min: 100, max: 999 }) : null,
				postalCode: faker.location.zipCode(secondCountry.zipFormat),
				city: faker.location.city(),
				country: secondCountry.code,
				phone: faker.helpers.replaceSymbols(
					`${faker.helpers.arrayElement(secondCountry.phonePrefixes)} ## ## ## ##`,
				),
				isDefault: false,
			});
		}
	}

	await prisma.address.createMany({ data: addressesData });
	console.log(`✅ ${addressesData.length} adresses créées`);

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
			startsAt: new Date(),
			endsAt: futureDate,
		},
		{
			code: "OFFRE5",
			type: DiscountType.FIXED_AMOUNT,
			value: 500,
			isActive: true,
			startsAt: new Date(),
			endsAt: futureDate,
		},
		{
			code: `ARCHIVE${currentYear - 1}`,
			type: DiscountType.PERCENTAGE,
			value: 15,
			isActive: false,
			startsAt: pastDate,
			endsAt: pastDate,
		},
		{
			code: "VIP20",
			type: DiscountType.PERCENTAGE,
			value: 20,
			isActive: true,
			maxUsageCount: 50,
			startsAt: new Date(),
			endsAt: futureDate,
		},
		{
			code: "PREMIERE",
			type: DiscountType.FIXED_AMOUNT,
			value: 1000,
			isActive: true,
			maxUsagePerUser: 1,
			startsAt: new Date(),
			endsAt: futureDate,
		},
		{
			code: "MINIMUM50",
			type: DiscountType.PERCENTAGE,
			value: 10,
			isActive: true,
			minOrderAmount: 5000,
			startsAt: new Date(),
			endsAt: futureDate,
		},
		{
			code: `ETE${currentYear}`,
			type: DiscountType.PERCENTAGE,
			value: 25,
			isActive: true,
			startsAt: new Date(),
			endsAt: futureDate,
		},
		{
			code: "FLASH30",
			type: DiscountType.PERCENTAGE,
			value: 30,
			isActive: true,
			maxUsageCount: 100,
			startsAt: new Date(),
			endsAt: futureDate,
		},
	];

	await prisma.discount.createMany({ data: discountsData });
	const discounts = await prisma.discount.findMany();
	console.log(`✅ ${discounts.length} codes promo créés`);

	// ============================================
	// UTILISATIONS CODES PROMO (batch)
	// ============================================
	const paidOrders = await prisma.order.findMany({
		where: { paymentStatus: PaymentStatus.PAID },
		select: { id: true, userId: true, subtotal: true },
		take: 25,
	});

	const activeDiscounts = discounts.filter((d) => d.isActive);
	const discountUsagesData: Prisma.DiscountUsageCreateManyInput[] = [];
	const discountUsageCounts = new Map<string, number>();

	for (const order of paidOrders) {
		if (!sampleBoolean(0.4)) continue;

		const discount = faker.helpers.arrayElement(activeDiscounts);
		const amountApplied =
			discount.type === DiscountType.PERCENTAGE
				? Math.round(order.subtotal * (discount.value / 100))
				: discount.value;

		discountUsagesData.push({
			discountId: discount.id,
			orderId: order.id,
			userId: order.userId,
			discountCode: discount.code,
			amountApplied: Math.min(amountApplied, order.subtotal),
		});

		discountUsageCounts.set(discount.id, (discountUsageCounts.get(discount.id) ?? 0) + 1);
	}

	await prisma.discountUsage.createMany({ data: discountUsagesData });

	// Batch update discount usage counts
	for (const [discountId, count] of discountUsageCounts) {
		await prisma.discount.update({
			where: { id: discountId },
			data: { usageCount: { increment: count } },
		});
	}

	// Update discountAmount and recalculate total on orders with discount usage
	for (const usage of discountUsagesData) {
		const order = await prisma.order.findUnique({
			where: { id: usage.orderId! },
			select: { subtotal: true, shippingCost: true },
		});
		if (!order) continue;

		const newTotal = Math.max(0, order.subtotal - usage.amountApplied + order.shippingCost);
		await prisma.order.update({
			where: { id: usage.orderId! },
			data: {
				discountAmount: usage.amountApplied,
				total: newTotal,
			},
		});
	}

	console.log(`✅ ${discountUsagesData.length} utilisations de codes promo créées`);

	// ============================================
	// PANIERS (CART + CART ITEM)
	// ============================================
	const usersForCarts = await prisma.user.findMany({
		where: { role: "USER" },
		select: { id: true },
		take: 8,
	});

	const activeSKUs = await prisma.productSku.findMany({
		where: { isActive: true, inventory: { gt: 0 }, deletedAt: null },
		select: { id: true, priceInclTax: true },
		take: 50,
	});

	let cartsCreated = 0;
	for (let i = 0; i < usersForCarts.length; i++) {
		const user = usersForCarts[i]!;
		const isAbandoned = i >= 5;

		const cartDate = new Date();
		if (isAbandoned) {
			cartDate.setDate(cartDate.getDate() - faker.number.int({ min: 7, max: 30 }));
		} else {
			cartDate.setHours(cartDate.getHours() - faker.number.int({ min: 1, max: 24 }));
		}

		const itemCount = faker.number.int({ min: 1, max: 4 });
		const selectedSKUs = faker.helpers.arrayElements(activeSKUs, itemCount);

		// Abandoned carts get expiresAt and some get abandonedEmailSentAt
		const expiresAt = new Date(cartDate);
		expiresAt.setDate(expiresAt.getDate() + 30);
		const abandonedEmailSentAt =
			isAbandoned && sampleBoolean(0.6) ? new Date(cartDate.getTime() + 2 * 60 * 60 * 1000) : null;

		try {
			await prisma.cart.create({
				data: {
					userId: user.id,
					expiresAt,
					abandonedEmailSentAt,
					createdAt: cartDate,
					updatedAt: cartDate,
					items: {
						create: selectedSKUs.map((sku) => ({
							skuId: sku.id,
							quantity: faker.number.int({ min: 1, max: 2 }),
							priceAtAdd: sku.priceInclTax,
						})),
					},
				},
			});
			cartsCreated++;
		} catch (error) {
			logError("cart-user", error);
		}
	}

	// Guest carts (sessionId)
	for (let i = 0; i < 3; i++) {
		const itemCount = faker.number.int({ min: 1, max: 3 });
		const selectedSKUs = faker.helpers.arrayElements(activeSKUs, itemCount);

		await prisma.cart.create({
			data: {
				sessionId: faker.string.uuid(),
				expiresAt: faker.date.future({ years: 0.1 }),
				items: {
					create: selectedSKUs.map((sku) => ({
						skuId: sku.id,
						quantity: 1,
						priceAtAdd: sku.priceInclTax,
					})),
				},
			},
		});
		cartsCreated++;
	}
	console.log(`✅ ${cartsCreated} paniers créés`);

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
		RefundStatus.REJECTED,
		RefundStatus.FAILED,
		RefundStatus.CANCELLED,
	];

	const refundReasons: RefundReason[] = [
		RefundReason.CUSTOMER_REQUEST,
		RefundReason.DEFECTIVE,
		RefundReason.WRONG_ITEM,
		RefundReason.LOST_IN_TRANSIT,
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
						refundStatus === RefundStatus.REJECTED
							? "Délai de rétractation dépassé"
							: refundStatus === RefundStatus.FAILED
								? "Stripe refund failed: card_not_found"
								: null,
					note:
						reason === RefundReason.DEFECTIVE
							? "Fermoir cassé à la réception - photos reçues par email"
							: null,
					createdBy: adminUser.id,
					processedAt:
						refundStatus === RefundStatus.COMPLETED || refundStatus === RefundStatus.FAILED
							? refundDate
							: null,
					createdAt: refundDate,
					items: {
						create: itemsToRefund.map((item) => ({
							orderItemId: item.id,
							quantity: item.quantity,
							amount: Math.min(item.price * item.quantity, refundAmount),
							restock: reason !== RefundReason.DEFECTIVE,
						})),
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
					createdBy: adminUser.id,
					processedAt: refundDate,
					createdAt: refundDate,
					items: {
						create: order.items.map((item) => ({
							orderItemId: item.id,
							quantity: item.quantity,
							amount: item.price * item.quantity,
							restock: true,
						})),
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
			fulfillmentStatus: true,
			createdAt: true,
		},
	});

	const allHistoryEntries: Prisma.OrderHistoryCreateManyInput[] = [];

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

		// 2. Payment (only for orders that actually got paid, not FAILED/EXPIRED)
		if (
			order.paymentStatus === PaymentStatus.PAID ||
			order.paymentStatus === PaymentStatus.REFUNDED ||
			order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
		) {
			currentDate = new Date(currentDate);
			currentDate.setMinutes(currentDate.getMinutes() + faker.number.int({ min: 5, max: 30 }));
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
			currentDate = new Date(currentDate);
			currentDate.setHours(currentDate.getHours() + faker.number.int({ min: 1, max: 24 }));
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
			currentDate = new Date(currentDate);
			currentDate.setDate(currentDate.getDate() + faker.number.int({ min: 1, max: 3 }));
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
			currentDate = new Date(currentDate);
			currentDate.setDate(currentDate.getDate() + faker.number.int({ min: 2, max: 5 }));
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
			currentDate = new Date(currentDate);
			currentDate.setHours(currentDate.getHours() + faker.number.int({ min: 1, max: 48 }));
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

	await prisma.orderHistory.createMany({ data: allHistoryEntries });
	console.log(`✅ ${allHistoryEntries.length} entrées d'historique de commandes créées`);

	// ============================================
	// NOTES DE COMMANDES (batch)
	// ============================================
	const ordersForNotes = await prisma.order.findMany({
		where: { status: { in: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.CANCELLED] } },
		select: { id: true, createdAt: true },
		take: 12,
	});

	const noteContents = [
		"Client a demandé un emballage cadeau - fait",
		"Livraison express demandée - priorité traitée",
		"Échange téléphonique avec la cliente - tout OK",
		"Adresse modifiée après validation - mise à jour Colissimo",
		"Demande de facture envoyée par email",
		"Retard livraison - client informé par email",
		"Bijou personnalisé avec gravure - vérifié avant envoi",
		"Réclamation traitée - geste commercial accordé",
		"Suivi colis bloqué - contact transporteur en cours",
		"Client fidèle - code promo VIP envoyé",
	];

	const orderNotesData: Prisma.OrderNoteCreateManyInput[] = [];

	for (const order of ordersForNotes) {
		if (!sampleBoolean(0.7)) continue;

		const noteDate = new Date(order.createdAt);
		noteDate.setHours(noteDate.getHours() + faker.number.int({ min: 2, max: 72 }));

		const noteAdmin = faker.helpers.arrayElement(adminUsers);
		orderNotesData.push({
			orderId: order.id,
			content: faker.helpers.arrayElement(noteContents),
			authorId: noteAdmin.id,
			authorName: noteAdmin.name,
			createdAt: noteDate,
		});
	}

	await prisma.orderNote.createMany({ data: orderNotesData });
	console.log(`✅ ${orderNotesData.length} notes de commandes créées`);

	// ============================================
	// WISHLISTS (FAVORIS)
	// ============================================
	const usersForWishlist = await prisma.user.findMany({
		where: { role: "USER" },
		select: { id: true },
		take: 6,
	});

	const allProducts = await prisma.product.findMany({
		where: { status: ProductStatus.PUBLIC, deletedAt: null },
		select: { id: true },
	});

	let wishlistsCreated = 0;

	// User wishlists
	for (const user of usersForWishlist) {
		const itemCount = faker.number.int({ min: 2, max: 5 });
		const selectedProducts = faker.helpers.arrayElements(allProducts, itemCount);

		try {
			await prisma.wishlist.create({
				data: {
					userId: user.id,
					items: {
						create: selectedProducts.map((product) => ({
							productId: product.id,
						})),
					},
				},
			});
			wishlistsCreated++;
		} catch (error) {
			logError("wishlist-user", error);
		}
	}

	// Guest wishlists (sessionId)
	for (let i = 0; i < 2; i++) {
		const itemCount = faker.number.int({ min: 1, max: 3 });
		const selectedProducts = faker.helpers.arrayElements(allProducts, itemCount);

		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 30);

		await prisma.wishlist.create({
			data: {
				sessionId: faker.string.uuid(),
				expiresAt,
				items: {
					create: selectedProducts.map((product) => ({
						productId: product.id,
					})),
				},
			},
		});
		wishlistsCreated++;
	}
	console.log(`✅ ${wishlistsCreated} wishlists créées`);

	// ============================================
	// NEWSLETTER SUBSCRIBERS (batch)
	// ============================================
	const newsletterEmails = [
		"marie.dupont@gmail.com",
		"sophie.martin@outlook.fr",
		"julie.bernard@yahoo.fr",
		"emma.petit@gmail.com",
		"lea.robert@hotmail.fr",
		"camille.richard@gmail.com",
		"chloe.durand@outlook.com",
		"manon.leroy@gmail.com",
		"ines.moreau@yahoo.fr",
		"sarah.simon@gmail.com",
		"laura.michel@hotmail.fr",
		"clara.garcia@outlook.fr",
	];

	// Link first 3 confirmed subscribers to existing users (M13)
	const usersForNewsletter = verifiedUsers.slice(0, 3);

	const newsletterData: Prisma.NewsletterSubscriberCreateManyInput[] = newsletterEmails.map(
		(email, i) => {
			let status: NewsletterStatus;
			let confirmedAt: Date | null = null;
			let unsubscribedAt: Date | null = null;
			let confirmationSentAt: Date | null = null;
			const confirmationToken = i < 4 ? faker.string.alphanumeric(32) : null;

			if (i < 6) {
				status = NewsletterStatus.CONFIRMED;
				confirmationSentAt = faker.date.past({ years: 0.6 });
				confirmedAt = faker.date.past({ years: 0.5 });
			} else if (i < 10) {
				status = NewsletterStatus.PENDING;
				confirmationSentAt = faker.date.recent({ days: 7 });
			} else {
				status = NewsletterStatus.UNSUBSCRIBED;
				confirmationSentAt = faker.date.past({ years: 1.1 });
				confirmedAt = faker.date.past({ years: 1 });
				unsubscribedAt = faker.date.recent({ days: 30 });
			}

			// Link to user accounts (M13)
			const linkedUser = i < usersForNewsletter.length ? usersForNewsletter[i] : null;

			return {
				email: linkedUser?.email ?? email,
				userId: linkedUser?.id ?? null,
				unsubscribeToken: faker.string.uuid(),
				status,
				confirmationToken,
				confirmationSentAt,
				confirmedAt,
				unsubscribedAt,
				ipAddress: faker.internet.ipv4(),
				confirmationIpAddress: confirmedAt ? faker.internet.ipv4() : null,
				userAgent: faker.internet.userAgent(),
				consentSource: "newsletter_form",
			};
		},
	);

	await prisma.newsletterSubscriber.createMany({ data: newsletterData });
	console.log(`✅ ${newsletterData.length} abonnés newsletter créés`);

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
		errorMessage: "Handler threw an error",
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

	// Add PENDING events for retry-webhooks cron
	webhookEventsData.push({
		stripeEventId: `evt_${faker.string.alphanumeric(24)}`,
		eventType: "payment_intent.succeeded",
		status: WebhookEventStatus.PENDING,
		attempts: 0,
		receivedAt: new Date(),
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
	// PHOTOS D'AVIS (REVIEW MEDIA) - batch
	// ============================================
	const reviewsForMedia = await prisma.productReview.findMany({
		where: { status: ReviewStatus.PUBLISHED, deletedAt: null },
		select: { id: true },
		take: 5,
	});

	const reviewPhotoUrls = [
		"https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop",
		"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop",
		"https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=400&fit=crop",
		"https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop",
		"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop",
	];

	const reviewMediaData: Prisma.ReviewMediaCreateManyInput[] = [];

	for (const review of reviewsForMedia) {
		const photoCount = faker.number.int({ min: 1, max: 3 });
		const selectedPhotos = faker.helpers.arrayElements(reviewPhotoUrls, photoCount);

		for (let i = 0; i < selectedPhotos.length; i++) {
			reviewMediaData.push({
				reviewId: review.id,
				url: selectedPhotos[i]!,
				altText: "Photo du bijou porté",
				position: i,
			});
		}
	}

	await prisma.reviewMedia.createMany({ data: reviewMediaData });
	console.log(`✅ ${reviewMediaData.length} photos d'avis créées`);

	// ============================================
	// DEMANDES DE PERSONNALISATION (batch)
	// ============================================
	const productTypesForCustomization = await prisma.productType.findMany({
		select: { id: true, label: true },
		take: 4,
	});

	const customizationDetails = [
		"Je souhaite un collier personnalisé avec le prénom de ma fille gravé sur le pendentif. Couleur or rose de préférence.",
		"Bracelet de mariage pour ma fiancée, avec nos initiales entrelacées. Budget autour de 150€.",
		"Je recherche une bague unique pour mes 30 ans, avec une pierre de naissance (saphir). Style moderne et épuré.",
		"Chaîne de corps bohème pour festival, longueur ajustable. Inspirée du modèle 'Bohème' mais en argent.",
	];

	const customizationStatuses: CustomizationRequestStatus[] = [
		CustomizationRequestStatus.PENDING,
		CustomizationRequestStatus.IN_PROGRESS,
		CustomizationRequestStatus.COMPLETED,
		CustomizationRequestStatus.PENDING,
	];

	// Use individual creates to support inspirationProducts connect (M12)
	const inspirationProductIds = allProducts.slice(0, 6).map((p) => p.id);

	let customizationsCreated = 0;
	for (let i = 0; i < customizationDetails.length; i++) {
		const details = customizationDetails[i]!;
		const productType = productTypesForCustomization[i % productTypesForCustomization.length]!;
		const cStatus = customizationStatuses[i]!;

		// First 2 requests linked to existing users (M12)
		const linkedUser = i < 2 ? verifiedUsers[i] : null;

		await prisma.customizationRequest.create({
			data: {
				firstName: linkedUser?.name.split(" ")[0] ?? faker.person.firstName(),
				email: linkedUser?.email ?? faker.internet.email().toLowerCase(),
				phone: sampleBoolean(0.6)
					? faker.helpers.replaceSymbols(
							`+33 ${faker.helpers.arrayElement(["6", "7"])} ## ## ## ##`,
						)
					: null,
				userId: linkedUser?.id ?? null,
				productTypeId: productType.id,
				productTypeLabel: productType.label,
				details,
				status: cStatus,
				consentGivenAt: new Date(),
				adminNotes:
					cStatus === CustomizationRequestStatus.IN_PROGRESS
						? "Devis envoyé, en attente de validation client"
						: null,
				respondedAt:
					cStatus !== CustomizationRequestStatus.PENDING ? faker.date.recent({ days: 14 }) : null,
				// Connect 1-2 inspiration products for linked users (M12)
				inspirationProducts: linkedUser
					? {
							connect: faker.helpers
								.arrayElements(inspirationProductIds, { min: 1, max: 2 })
								.map((id) => ({ id })),
						}
					: undefined,
			},
		});
		customizationsCreated++;
	}
	console.log(`✅ ${customizationsCreated} demandes de personnalisation créées`);

	// ============================================
	// DISPUTES (M4)
	// ============================================
	const ordersForDisputes = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PAID,
			status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED] },
		},
		select: { id: true, total: true, createdAt: true },
		take: 3,
		orderBy: { createdAt: "desc" },
	});

	const disputeReasons = ["FRAUDULENT", "PRODUCT_NOT_RECEIVED", "PRODUCT_UNACCEPTABLE"] as const;
	const disputeStatuses = ["NEEDS_RESPONSE", "UNDER_REVIEW", "LOST"] as const;

	for (let i = 0; i < ordersForDisputes.length; i++) {
		const order = ordersForDisputes[i]!;
		const disputeDate = new Date(order.createdAt);
		disputeDate.setDate(disputeDate.getDate() + faker.number.int({ min: 5, max: 30 }));

		const dueBy = new Date(disputeDate);
		dueBy.setDate(dueBy.getDate() + 21);

		await prisma.dispute.create({
			data: {
				stripeDisputeId: `dp_${faker.string.alphanumeric(24)}`,
				orderId: order.id,
				amount: order.total,
				fee: 1500,
				reason: disputeReasons[i]!,
				status: disputeStatuses[i]!,
				dueBy: disputeStatuses[i] === "NEEDS_RESPONSE" ? dueBy : null,
				resolvedAt: disputeStatuses[i] === "LOST" ? disputeDate : null,
				createdAt: disputeDate,
			},
		});
	}
	console.log(`✅ ${ordersForDisputes.length} disputes créées`);

	// ============================================
	// AUDIT LOG (M5)
	// ============================================
	const auditActions = [
		{ action: "product.create", targetType: "product", note: "Created product" },
		{ action: "product.update", targetType: "product", note: "Updated price" },
		{ action: "product.archive", targetType: "product", note: "Archived product" },
		{ action: "order.cancel", targetType: "order", note: "Cancelled by admin" },
		{ action: "order.update_status", targetType: "order", note: "Updated to shipped" },
		{ action: "refund.process", targetType: "refund", note: "Processed refund" },
		{ action: "refund.reject", targetType: "refund", note: "Rejected refund request" },
		{ action: "discount.create", targetType: "discount", note: "Created BIENVENUE10" },
		{ action: "discount.deactivate", targetType: "discount", note: "Deactivated expired code" },
		{ action: "sku.update_stock", targetType: "sku", note: "Stock adjustment +10" },
		{ action: "user.ban", targetType: "user", note: "Suspended account" },
		{ action: "collection.update", targetType: "collection", note: "Updated featured" },
		{ action: "dispute.respond", targetType: "dispute", note: "Submitted evidence" },
		{ action: "product_type.create", targetType: "product_type", note: "Created new type" },
		{ action: "review.hide", targetType: "review", note: "Hidden inappropriate review" },
	];

	const auditLogData: Prisma.AuditLogCreateManyInput[] = auditActions.map((entry, i) => {
		const admin = faker.helpers.arrayElement(adminUsers);
		const logDate = new Date();
		logDate.setDate(logDate.getDate() - faker.number.int({ min: 1, max: 45 }));

		return {
			adminId: admin.id,
			adminName: admin.name,
			action: entry.action,
			targetType: entry.targetType,
			targetId: faker.string.alphanumeric(25),
			metadata: { note: entry.note, index: i },
			createdAt: logDate,
		};
	});

	await prisma.auditLog.createMany({ data: auditLogData });
	console.log(`✅ ${auditLogData.length} entrées d'audit log créées`);

	// ============================================
	// TESTIMONIALS (missing model)
	// ============================================
	const testimonialData: Prisma.TestimonialCreateManyInput[] = [
		{
			imageUrl:
				"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
			blurDataUrl:
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAADklEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==",
		},
		{
			imageUrl:
				"https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=200&h=200&fit=crop&crop=face",
		},
		{
			imageUrl: null,
		},
	];
	await prisma.testimonial.createMany({ data: testimonialData });
	console.log(`✅ ${testimonialData.length} témoignages créés`);

	// ============================================
	// FAILED EMAILS (missing model - for retry-failed-emails cron)
	// ============================================
	const failedEmailData: Prisma.FailedEmailCreateManyInput[] = [
		{
			taskType: "ORDER_CONFIRMATION_EMAIL",
			payload: { orderId: "fake-order-id-1", email: "test@example.com" },
			attempts: 2,
			lastError: "Resend API rate limit exceeded",
			nextRetryAt: new Date(),
		},
		{
			taskType: "SHIPPING_NOTIFICATION_EMAIL",
			payload: { orderId: "fake-order-id-2", email: "test2@example.com", trackingNumber: "ABC123" },
			attempts: 1,
			lastError: "Connection timeout to Resend API",
			nextRetryAt: new Date(Date.now() + 30 * 60 * 1000),
		},
		{
			taskType: "REVIEW_REQUEST_EMAIL",
			payload: { orderId: "fake-order-id-3", email: "test3@example.com" },
			attempts: 5,
			lastError: "Max attempts reached",
			nextRetryAt: new Date(),
			resolvedAt: new Date(),
		},
	];
	await prisma.failedEmail.createMany({ data: failedEmailData });
	console.log(`✅ ${failedEmailData.length} failed emails créés`);

	// ============================================
	// CUSTOMIZATION MEDIA (missing model)
	// ============================================
	const customizationRequests = await prisma.customizationRequest.findMany({
		select: { id: true },
		take: 2,
	});

	const customizationMediaData: Prisma.CustomizationMediaCreateManyInput[] = [];
	for (const req of customizationRequests) {
		customizationMediaData.push({
			customizationRequestId: req.id,
			url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop",
			altText: "Photo inspiration client",
			position: 0,
		});
	}
	if (customizationMediaData.length > 0) {
		await prisma.customizationMedia.createMany({ data: customizationMediaData });
		console.log(`✅ ${customizationMediaData.length} médias de personnalisation créés`);
	}

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

		// Pending deletion user
		await prisma.user.update({
			where: { id: edgeCaseUsers[1]!.id },
			data: {
				accountStatus: AccountStatus.PENDING_DELETION,
				deletionRequestedAt: faker.date.recent({ days: 14 }),
			},
		});

		// Anonymized user
		await prisma.user.update({
			where: { id: edgeCaseUsers[2]!.id },
			data: {
				accountStatus: AccountStatus.ANONYMIZED,
				anonymizedAt: faker.date.recent({ days: 30 }),
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
			startsAt: new Date(),
			endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		},
		{
			code: "ADMIN_DISABLED",
			type: DiscountType.PERCENTAGE,
			value: 20,
			isActive: true,
			manuallyDeactivated: true,
			startsAt: new Date(),
			endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		},
	];
	await prisma.discount.createMany({ data: edgeCaseDiscounts });
	console.log(`✅ ${edgeCaseDiscounts.length} codes promo edge-case créés`);

	// ============================================
	// WISHLIST backInStockNotifiedAt (edge case)
	// ============================================
	const wishlistItemsForNotification = await prisma.wishlistItem.findMany({
		select: { id: true },
		take: 2,
	});
	for (const item of wishlistItemsForNotification) {
		await prisma.wishlistItem.update({
			where: { id: item.id },
			data: { backInStockNotifiedAt: faker.date.recent({ days: 7 }) },
		});
	}
	if (wishlistItemsForNotification.length > 0) {
		console.log(
			`✅ ${wishlistItemsForNotification.length} wishlist items avec backInStockNotifiedAt`,
		);
	}

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

	// Soft-delete 3 reviews
	const reviewsToSoftDelete = await prisma.productReview.findMany({
		where: { deletedAt: null },
		select: { id: true },
		take: 3,
		orderBy: { createdAt: "desc" },
	});
	for (const r of reviewsToSoftDelete) {
		await prisma.productReview.update({
			where: { id: r.id },
			data: { deletedAt },
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
		`✅ Records soft-deleted: ${productsToSoftDelete.length} produits, ${reviewsToSoftDelete.length} avis, ${ordersToSoftDelete.length} commandes`,
	);

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
