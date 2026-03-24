import "dotenv/config";
import { fakerFR } from "@faker-js/faker";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
	CollectionStatus,
	CustomizationRequestStatus,
	DiscountType,
	NewsletterStatus,
	type Prisma,
	PrismaClient,
	ProductStatus,
} from "../app/generated/prisma/client";

// ============================================
// PRODUCTION GUARD
// ============================================
if (process.env.NODE_ENV === "production") {
	console.error("❌ Seed interdit en production. Utilisez NODE_ENV=development.");
	process.exit(1);
}

if (!process.env.DATABASE_URL) {
	console.error("❌ DATABASE_URL is not set. Please set it in your .env file.");
	process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const faker = fakerFR;
faker.seed(84);

function daysFromNow(days: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d;
}

// ============================================
// MAIN
// ============================================
async function main(): Promise<void> {
	console.log("🌱 Seed de contenu supplémentaire...\n");

	// ============================================
	// FETCH EXISTING DATA
	// ============================================
	const products = await prisma.product.findMany({
		where: { deletedAt: null, status: ProductStatus.PUBLIC },
		select: { id: true, slug: true, title: true, type: { select: { slug: true } } },
	});

	const productTypes = await prisma.productType.findMany({
		select: { id: true, slug: true },
	});

	const typeSlugMap = new Map(productTypes.map((t) => [t.slug, t.id]));

	// Group products by type slug
	const productsByType = new Map<string, typeof products>();
	for (const p of products) {
		const typeSlug = p.type?.slug;
		if (!typeSlug) continue;
		const list = productsByType.get(typeSlug) ?? [];
		list.push(p);
		productsByType.set(typeSlug, list);
	}

	console.log(`📦 ${products.length} produits existants trouvés`);
	for (const [type, prods] of productsByType) {
		console.log(`   - ${type}: ${prods.length}`);
	}

	// ============================================
	// 1. COLLECTIONS
	// ============================================
	console.log("\n📂 Seeding collections...");

	const newCollections = [
		{
			slug: "saint-valentin",
			name: "Saint-Valentin",
			description: "Des bijoux qui disent je t'aime, faits main avec amour",
			status: CollectionStatus.PUBLIC,
		},
		{
			slug: "minimaliste",
			name: "Minimaliste",
			description: "L'élégance dans la simplicité, des lignes pures et délicates",
			status: CollectionStatus.PUBLIC,
		},
		{
			slug: "boheme",
			name: "Bohème",
			description: "Esprit libre et pièces uniques, inspirées par la nature",
			status: CollectionStatus.PUBLIC,
		},
		{
			slug: "idees-cadeaux",
			name: "Idées cadeaux",
			description: "Trouvez le cadeau parfait pour chaque occasion",
			status: CollectionStatus.PUBLIC,
		},
		{
			slug: "ete-2026",
			name: "Été 2026",
			description: "Collection estivale aux couleurs solaires",
			status: CollectionStatus.DRAFT,
		},
	];

	for (const col of newCollections) {
		await prisma.collection.upsert({
			where: { slug: col.slug },
			update: { name: col.name, description: col.description, status: col.status },
			create: col,
		});
	}

	const collections = await prisma.collection.findMany();
	const collectionMap = new Map(collections.map((c) => [c.slug, c.id]));
	console.log(`✅ ${newCollections.length} collections upserted (total: ${collections.length})`);

	// ============================================
	// 2. PRODUCT-COLLECTION LINKS
	// ============================================
	console.log("\n🔗 Linking products to new collections...");

	const collectionAssignments: Record<string, string[]> = {
		"saint-valentin": ["colliers", "bagues"],
		minimaliste: ["bagues", "bracelets"],
		boheme: ["chaines-corps", "chaines-cheveux", "papilloux"],
		"idees-cadeaux": ["porte-cles", "bracelets", "colliers"],
		"ete-2026": ["colliers", "bracelets", "papilloux"],
	};

	const productCollectionLinks: Prisma.ProductCollectionCreateManyInput[] = [];
	const featuredCollections = new Set<string>();

	for (const [collectionSlug, typesSlugs] of Object.entries(collectionAssignments)) {
		const collectionId = collectionMap.get(collectionSlug);
		if (!collectionId) continue;

		let count = 0;
		const maxPerType = collectionSlug === "ete-2026" ? 2 : 4;

		for (const typeSlug of typesSlugs) {
			const typeProducts = productsByType.get(typeSlug) ?? [];
			const selected = typeProducts.slice(0, maxPerType);

			for (const product of selected) {
				const isFeatured = !featuredCollections.has(collectionId);
				if (isFeatured) featuredCollections.add(collectionId);

				productCollectionLinks.push({
					productId: product.id,
					collectionId,
					isFeatured,
				});
				count++;
			}
		}

		console.log(`   - ${collectionSlug}: ${count} produits`);
	}

	if (productCollectionLinks.length > 0) {
		const result = await prisma.productCollection.createMany({
			data: productCollectionLinks,
			skipDuplicates: true,
		});
		console.log(
			`✅ ${result.count} liens produit-collection créés (${productCollectionLinks.length - result.count} déjà existants)`,
		);
	}

	// ============================================
	// 3. ANNOUNCEMENT BARS
	// ============================================
	console.log("\n📢 Seeding announcement bars...");

	const existingAnnouncements = await prisma.announcementBar.count();
	if (existingAnnouncements > 0) {
		console.log(`⏭️  ${existingAnnouncements} annonces déjà existantes, skip`);
	} else {
		const announcements: Prisma.AnnouncementBarCreateManyInput[] = [
			{
				message: "Livraison offerte dès 50€ d'achat !",
				link: "/boutique",
				linkText: "Découvrir",
				startsAt: daysFromNow(-7),
				endsAt: daysFromNow(30),
				isActive: true,
				dismissDurationHours: 24,
			},
			{
				message: "Nouvelle collection Saint-Valentin disponible",
				link: "/collections/saint-valentin",
				linkText: "Voir la collection",
				startsAt: daysFromNow(30),
				endsAt: daysFromNow(60),
				isActive: false,
				dismissDurationHours: 48,
			},
			{
				message: "-15% sur tout le site avec le code ETE2026",
				link: "/boutique",
				linkText: "En profiter",
				startsAt: daysFromNow(-90),
				endsAt: daysFromNow(-60),
				isActive: false,
				dismissDurationHours: 12,
			},
			{
				message: "Chaque bijou est fabriqué à la main dans mon atelier en France",
				link: "/atelier",
				linkText: "Découvrir l'atelier",
				startsAt: daysFromNow(-3),
				endsAt: null,
				isActive: false,
				dismissDurationHours: 72,
			},
			{
				message: "Derniers jours pour commander avant les fêtes !",
				link: "/boutique",
				linkText: "Commander",
				startsAt: daysFromNow(-120),
				endsAt: daysFromNow(-100),
				isActive: false,
				dismissDurationHours: 24,
			},
		];

		await prisma.announcementBar.createMany({ data: announcements });
		console.log(`✅ ${announcements.length} annonces créées`);
	}

	// ============================================
	// 4. FAQ ITEMS
	// ============================================
	console.log("\n❓ Seeding FAQ items...");

	const existingHighPositionFaq = await prisma.faqItem.count({ where: { position: { gte: 6 } } });
	if (existingHighPositionFaq > 0) {
		console.log(`⏭️  ${existingHighPositionFaq} FAQ items (position >= 6) déjà existants, skip`);
	} else {
		const newFaqItems = [
			{
				question: "Vos bijoux conviennent-ils aux peaux sensibles ?",
				answer:
					"Absolument ! Tous les éléments métalliques (crochets, fermoirs, chaînes) sont en acier inoxydable, un matériau hypoallergénique reconnu. Mes bijoux en plastique fou ne contiennent aucune substance allergène. Vous pouvez les porter en toute confiance, même sur les peaux les plus sensibles.",
				links: undefined,
				position: 6,
			},
			{
				question: "Proposez-vous des emballages cadeaux ?",
				answer:
					"Chaque bijou est envoyé dans une jolie pochette en tissu réutilisable, parfaite pour offrir. Si vous souhaitez un mot personnalisé à glisser dans le colis, indiquez-le en commentaire lors de votre commande, je me ferai un plaisir de l'écrire à la main !",
				links: undefined,
				position: 7,
			},
			{
				question: "Comment savoir quelle taille choisir ?",
				answer:
					"Chaque fiche produit indique les dimensions exactes du bijou. Pour les bagues, je recommande de mesurer un anneau que vous portez déjà. Pour les colliers, la longueur standard est de 45 cm. N'hésitez pas à me {{link0}} si vous avez un doute !",
				links: [{ text: "contacter", href: "/personnalisation" }],
				position: 8,
			},
			{
				question: "Livrez-vous en dehors de la France ?",
				answer:
					"Oui, je livre dans toute l'Union européenne ! Les frais de port sont calculés automatiquement selon votre pays. Le délai est généralement de 5 à 10 jours ouvrés pour les livraisons hors France. Consultez mes {{link0}} pour plus de détails.",
				links: [{ text: "conditions de livraison", href: "/cgv" }],
				position: 9,
			},
		];

		for (const item of newFaqItems) {
			await prisma.faqItem.create({
				data: {
					question: item.question,
					answer: item.answer,
					links: item.links ?? undefined,
					position: item.position,
					isActive: true,
				},
			});
		}

		console.log(`✅ ${newFaqItems.length} FAQ items créés (positions 6-9)`);
	}

	// ============================================
	// 5. DISCOUNTS
	// ============================================
	console.log("\n🏷️  Seeding discounts...");

	const newDiscounts = [
		{
			code: "STVALENTIN",
			type: DiscountType.PERCENTAGE,
			value: 15,
			minOrderAmount: 3000,
			maxUsageCount: 200,
			maxUsagePerUser: 1,
			isActive: true,
			startsAt: daysFromNow(-5),
			endsAt: daysFromNow(40),
		},
		{
			code: "NEWSLETTER15",
			type: DiscountType.PERCENTAGE,
			value: 15,
			minOrderAmount: null,
			maxUsageCount: null,
			maxUsagePerUser: 1,
			isActive: true,
			startsAt: daysFromNow(-30),
			endsAt: null,
		},
		{
			code: "PARRAINAGE",
			type: DiscountType.FIXED_AMOUNT,
			value: 800,
			minOrderAmount: 4000,
			maxUsageCount: null,
			maxUsagePerUser: 3,
			isActive: true,
			startsAt: daysFromNow(-60),
			endsAt: null,
		},
		{
			code: "PRINTEMPS26",
			type: DiscountType.PERCENTAGE,
			value: 20,
			minOrderAmount: 2500,
			maxUsageCount: 150,
			maxUsagePerUser: 1,
			isActive: true,
			startsAt: daysFromNow(60),
			endsAt: daysFromNow(120),
		},
		{
			code: "NOEL25",
			type: DiscountType.FIXED_AMOUNT,
			value: 1500,
			minOrderAmount: 6000,
			maxUsageCount: 100,
			maxUsagePerUser: 1,
			isActive: false,
			startsAt: daysFromNow(-120),
			endsAt: daysFromNow(-90),
		},
		{
			code: "FIDELE",
			type: DiscountType.PERCENTAGE,
			value: 10,
			minOrderAmount: null,
			maxUsageCount: null,
			maxUsagePerUser: null,
			isActive: true,
			startsAt: daysFromNow(-90),
			endsAt: null,
		},
	];

	let discountCount = 0;
	for (const d of newDiscounts) {
		await prisma.discount.upsert({
			where: { code: d.code },
			update: {
				type: d.type,
				value: d.value,
				minOrderAmount: d.minOrderAmount,
				maxUsageCount: d.maxUsageCount,
				maxUsagePerUser: d.maxUsagePerUser,
				isActive: d.isActive,
				startsAt: d.startsAt,
				endsAt: d.endsAt,
			},
			create: {
				code: d.code,
				type: d.type,
				value: d.value,
				minOrderAmount: d.minOrderAmount,
				maxUsageCount: d.maxUsageCount,
				maxUsagePerUser: d.maxUsagePerUser,
				isActive: d.isActive,
				startsAt: d.startsAt,
				endsAt: d.endsAt,
			},
		});
		discountCount++;
	}

	console.log(`✅ ${discountCount} discounts upserted`);

	// ============================================
	// 6. NEWSLETTER SUBSCRIBERS
	// ============================================
	console.log("\n📧 Seeding newsletter subscribers...");

	const newSubscribers = [
		{ email: "alice.renaud@gmail.com", status: NewsletterStatus.CONFIRMED },
		{ email: "lucie.fontaine@outlook.fr", status: NewsletterStatus.CONFIRMED },
		{ email: "oceane.chevalier@yahoo.fr", status: NewsletterStatus.CONFIRMED },
		{ email: "margot.henry@gmail.com", status: NewsletterStatus.CONFIRMED },
		{ email: "pauline.girard@hotmail.fr", status: NewsletterStatus.PENDING },
		{ email: "amelie.lambert@gmail.com", status: NewsletterStatus.PENDING },
		{ email: "elise.bonnet@outlook.com", status: NewsletterStatus.UNSUBSCRIBED },
		{ email: "nina.faure@gmail.com", status: NewsletterStatus.UNSUBSCRIBED },
	];

	let subscriberCount = 0;
	for (const sub of newSubscribers) {
		const now = new Date();
		const consentDate = new Date(now.getTime() - faker.number.int({ min: 1, max: 90 }) * 86400000);
		const confirmationToken = faker.string.uuid();
		const unsubscribeToken = faker.string.uuid();

		const isConfirmed = sub.status === NewsletterStatus.CONFIRMED;
		const isUnsubscribed = sub.status === NewsletterStatus.UNSUBSCRIBED;

		await prisma.newsletterSubscriber.upsert({
			where: { email: sub.email },
			update: {},
			create: {
				email: sub.email,
				status: sub.status,
				confirmationToken,
				unsubscribeToken,
				confirmedAt: isConfirmed ? new Date(consentDate.getTime() + 3600000) : null,
				unsubscribedAt: isUnsubscribed ? new Date(consentDate.getTime() + 30 * 86400000) : null,
				consentTimestamp: consentDate,
				ipAddress: faker.internet.ipv4(),
				confirmationIpAddress: isConfirmed ? faker.internet.ipv4() : null,
				userAgent: faker.internet.userAgent(),
				consentSource: "newsletter_form",
			},
		});
		subscriberCount++;
	}

	console.log(`✅ ${subscriberCount} newsletter subscribers upserted`);

	// ============================================
	// 7. CUSTOMIZATION REQUESTS
	// ============================================
	console.log("\n🎨 Seeding customization requests...");

	const customizationRequests = [
		{
			firstName: "Océane",
			email: "oceane.bijoux@gmail.com",
			phone: "+33 6 12 34 56 78",
			details:
				"Je rêve d'un papillon de visage aux couleurs de l'arc-en-ciel pour un festival de musique cet été. Quelque chose de très coloré et festif !",
			status: CustomizationRequestStatus.PENDING,
			adminNotes: null,
			typeSlug: "papilloux",
			typeLabel: "Papilloux",
		},
		{
			firstName: "Margaux",
			email: "margaux.design@outlook.fr",
			phone: null,
			details:
				"Un collier avec un pendentif représentant mon chat. J'ai une photo de lui que je peux vous envoyer. Je voudrais que ce soit le plus fidèle possible.",
			status: CustomizationRequestStatus.PENDING,
			adminNotes: null,
			typeSlug: "colliers",
			typeLabel: "Colliers",
		},
		{
			firstName: "Camille",
			email: "camille.riviere@yahoo.fr",
			phone: "+33 7 98 76 54 32",
			details:
				"Bracelet duo mère-fille assorti. Deux bracelets identiques mais de tailles différentes, avec un petit cœur. Budget 60 euros pour les deux.",
			status: CustomizationRequestStatus.IN_PROGRESS,
			adminNotes: "Devis de 55€ envoyé par email, en attente de confirmation. Croquis réalisé.",
			typeSlug: "bracelets",
			typeLabel: "Bracelets",
		},
		{
			firstName: "Juliette",
			email: "juliette.martin@gmail.com",
			phone: "+33 6 45 67 89 01",
			details:
				"Un porte-clés avec la silhouette de la Tour Eiffel pour offrir à une amie qui part vivre à l'étranger. Couleur or rose. C'est un cadeau d'adieu.",
			status: CustomizationRequestStatus.COMPLETED,
			adminNotes: "Réalisé et envoyé le 15 mars. Cliente très satisfaite.",
			typeSlug: "porte-cles",
			typeLabel: "Porte-clés",
		},
	];

	let customizationCount = 0;
	for (const req of customizationRequests) {
		const existing = await prisma.customizationRequest.count({
			where: { email: req.email, firstName: req.firstName },
		});
		if (existing > 0) continue;

		// Pick 1-2 inspiration products from the matching type
		const typeProducts = productsByType.get(req.typeSlug) ?? [];
		const inspirationIds = typeProducts
			.slice(0, faker.number.int({ min: 1, max: 2 }))
			.map((p) => ({ id: p.id }));

		const consentDate = new Date(Date.now() - faker.number.int({ min: 5, max: 45 }) * 86400000);
		const productTypeId = typeSlugMap.get(req.typeSlug) ?? null;

		await prisma.customizationRequest.create({
			data: {
				firstName: req.firstName,
				email: req.email,
				phone: req.phone,
				details: req.details,
				productTypeLabel: req.typeLabel,
				productTypeId,
				status: req.status,
				adminNotes: req.adminNotes,
				inspirationProducts: inspirationIds.length > 0 ? { connect: inspirationIds } : undefined,
				consentGivenAt: consentDate,
				createdAt: consentDate,
			},
		});
		customizationCount++;
	}

	console.log(`✅ ${customizationCount} customization requests créées`);

	// ============================================
	// SUMMARY
	// ============================================
	console.log("\n🎉 Seed de contenu terminé avec succès!");
}

main()
	.catch((error) => {
		console.error("❌ Erreur lors du seed:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
