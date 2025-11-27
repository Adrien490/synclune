import { fakerFR } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
} from "../app/generated/prisma/client";
import { SYNCLUNE_JEWELRY_TYPES } from "../shared/constants/jewelry-types";
import { seedColorTaxonomy } from "./seeds/color-taxonomy";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
const faker = fakerFR;
faker.seed(42);

type SlugDomain = "product" | "collection";

const slugSets: Record<SlugDomain, Set<string>> = {
  product: new Set<string>(),
  collection: new Set<string>(),
};

const usedSkus = new Set<string>();

const MATERIAL_NAMES = [
  "Argent 925",
  "Plaqué or 18k",
  "Acier inoxydable",
  "Or rose 14k",
  "Cuir grainé",
  "Perles d'eau douce",
  "Email grand feu",
  "Quartz fumé",
  "Nacre lumineuse",
  "Or jaune recyclé",
];

const productAdjectives = [
  "Éclat",
  "Aurore",
  "Velours",
  "Iris",
  "Ombre",
  "Solstice",
  "Élégance",
  "Sérénité",
  "Aura",
  "Galaxie",
  "Opale",
  "Muse",
  "Émeraude",
  "Cristal",
  "Perle",
  "Divine",
  "Sublime",
  "Délicate",
  "Précieuse",
  "Radieuse",
  "Étincelle",
  "Cascade",
  "Harmonie",
  "Lune",
];

const productNouns = [
  "Lumineuse",
  "Céleste",
  "Boréale",
  "Éternelle",
  "Rivière",
  "Florale",
  "Solène",
  "Nacrée",
  "Ondine",
  "Vibrante",
  "Aurora",
  "Azur",
  "Stellaire",
  "Rosée",
  "Infinie",
  "Étoilée",
  "Océane",
  "Royale",
  "Poétique",
  "Féerique",
  "Dorée",
  "Argentée",
  "Mystique",
  "Enchantée",
];

interface SeedSku {
  id: string;
  productId: string;
  price: number;
  priceInclTax: number;
  sku: string;
  isActive: boolean;
  colorId?: string;
  material?: string;
}

interface SeedProductType {
  id: string;
  slug: string;
  label: string;
}

interface SeedProduct {
  id: string;
  title: string;
  slug: string;
  typeId: string;
  typeSlug: string;
}

interface PurchaseIndex {
  userProduct: Map<string, Set<string>>;
}

type SeedUser = Prisma.UserCreateManyInput & { id: string };

const purchases: PurchaseIndex = {
  userProduct: new Map(),
};

function slugifyUnique(domain: SlugDomain, value: string): string {
  const baseSlug =
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";

  let uniqueSlug = baseSlug;
  let suffix = 1;
  const seen = slugSets[domain];
  while (seen.has(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  seen.add(uniqueSlug);
  return uniqueSlug;
}

function euroCents(min: number, max: number): number {
  return faker.number.int({ min, max });
}

function getJewelryImageUrl(
  typeSlug: string,
  index: number = 0,
  productSlug: string = "",
): string {
  // Images de bijoux haute qualité 2025 - URLs modernes et diversifiées
  const jewelryImages: Record<string, string[]> = {
    EARRINGS: [
      "https://images.unsplash.com/photo-1635767016903-895899885b10", // Gold earrings on marble
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908", // Pearl drop earrings
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638", // Elegant hoops
      "https://images.unsplash.com/photo-1588444650700-c5cfae6a9dd2", // Diamond studs
      "https://images.unsplash.com/photo-1629489303073-8ee93c2aac72", // Modern silver earrings
      "https://images.unsplash.com/photo-1630019852942-f89202989a59", // Artistic earrings
    ],
    RINGS: [
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e", // Diamond engagement ring
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338", // Gold rings collection
      "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1", // Delicate band rings
      "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36", // Statement ring
      "https://images.unsplash.com/photo-1603561596112-0a132b757442", // Stacked rings
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a", // Rose gold ring
    ],
    NECKLACES: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f", // Layered necklaces
      "https://images.unsplash.com/photo-1634712282287-14ed57b9cc89", // Pendant necklace
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638", // Pearl necklace
      "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0", // Gold chain
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a", // Modern pendant
      "https://images.unsplash.com/photo-1602173574767-37ac01994b2a", // Delicate chain
    ],
    BRACELETS: [
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a", // Gold bracelet
      "https://images.unsplash.com/photo-1584302179602-e4578d0ffe15", // Bangle set
      "https://images.unsplash.com/photo-1573408301185-9146fe634ad0", // Chain bracelet
      "https://images.unsplash.com/photo-1590736969955-71cc94901144", // Beaded bracelet
      "https://images.unsplash.com/photo-1613450823505-26234afa88a9", // Charm bracelet
      "https://images.unsplash.com/photo-1635767016903-895899885b10", // Elegant cuff
    ],
    ENGRAVINGS: [
      "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1", // Engraved pendant
      "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36", // Custom ring
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a", // Personalized jewelry
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338", // Engraved band
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e", // Custom piece
    ],
    BODY_CHAINS: [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338", // Body chain
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f", // Layered chains
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638", // Delicate body jewelry
      "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1", // Modern body chain
    ],
    PAPILLOUX: [
      "https://images.unsplash.com/photo-1594736797933-d0d8aa06a2d8", // Butterfly jewelry
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f", // Artistic pendant
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638", // Delicate charm
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a", // Nature-inspired
    ],
    HAIR_CHAINS: [
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9", // Hair accessory
      "https://images.unsplash.com/photo-1617038220319-276d3cfab638", // Elegant chain
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f", // Hair jewelry
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338", // Decorative chain
    ],
    KEYCHAINS: [
      "https://images.unsplash.com/photo-1558618047-8c90d7e75e03", // Luxury keychain
      "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1", // Gold keychain
      "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36", // Designer keychain
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338", // Elegant charm
    ],
  };

  const images = jewelryImages[typeSlug] || jewelryImages.NECKLACES;
  const baseUrl = images[index % images.length];
  // Paramètres 2025 optimisés pour Unsplash avec auto=format et quality
  return `${baseUrl}?auto=format&fit=crop&w=800&h=800&q=85&fm=webp&product=${encodeURIComponent(productSlug)}&view=${index}`;
}

function sampleBoolean(probability: number): boolean {
  return (
    faker.number.float({ min: 0, max: 1, fractionDigits: 4 }) < probability
  );
}

function generateProductTitle(typeSlug: string): string {
  const prefixMap: Record<string, string> = {
    EARRINGS: "Boucles",
    RINGS: "Bague",
    NECKLACES: "Collier",
    BRACELETS: "Bracelet",
    ENGRAVINGS: "Gravure",
    BODY_CHAINS: "Chaîne",
    PAPILLOUX: "Papilloux",
    HAIR_CHAINS: "Chaîne cheveux",
    KEYCHAINS: "Porte-clé",
  };

  const adjective = faker.helpers.arrayElement(productAdjectives);
  const noun = faker.helpers.arrayElement(productNouns);
  const prefix = prefixMap[typeSlug] || "Bijou";
  return `${prefix} ${adjective} ${noun}`;
}

function generateProductDescription(typeSlug: string, title: string): string {
  const descriptionTemplates: Record<string, string[]> = {
    EARRINGS: [
      `${title} allient élégance et raffinement. Ces boucles d'oreilles sont le fruit d'un savoir-faire artisanal exceptionnel. Finement travaillées, elles captent la lumière et subliment votre visage. Parfaites pour toutes les occasions, du quotidien aux événements spéciaux.\n\nChaque paire est confectionnée avec soin dans notre atelier à Nantes, garantissant une qualité irréprochable et un confort optimal.`,
      `Découvrez ${title}, des boucles d'oreilles qui incarnent la modernité et l'intemporalité. Leur design délicat s'adapte à tous les styles, du plus casual au plus sophistiqué.\n\nPortées seules ou en accumulation, elles apporteront une touche d'éclat à votre tenue. Hypoallergéniques et confortables, elles conviennent aux peaux les plus sensibles.`,
    ],
    RINGS: [
      `${title} est une pièce unique qui raconte une histoire. Cette bague élégante a été conçue pour accompagner vos moments les plus précieux. Son design soigné et sa finition impeccable en font un bijou d'exception.\n\nFabriquée avec des matériaux nobles dans notre atelier nantais, elle peut être portée seule pour un look minimaliste ou associée à d'autres bagues pour un style plus audacieux.`,
      `Laissez-vous séduire par ${title}, une bague qui allie tradition et modernité. Sa forme ergonomique assure un confort tout au long de la journée. Chaque détail a été pensé pour créer une harmonie parfaite.\n\nCette bague est le reflet de notre engagement envers l'artisanat de qualité. Elle peut être offerte en cadeau ou s'offrir à soi-même pour célébrer un moment important.`,
    ],
    NECKLACES: [
      `${title} est bien plus qu'un simple bijou. Ce collier délicat rehausse n'importe quelle tenue avec grâce. Porté court ou en superposition, il s'adapte à votre style et à votre humeur.\n\nChaque collier est assemblé à la main dans notre atelier de Nantes avec une attention particulière aux détails. La chaîne, robuste mais légère, assure un port agréable du matin au soir.`,
      `Élégant et polyvalent, ${title} saura vous séduire par sa finesse et sa beauté. Ce collier incarne notre vision de la bijouterie contemporaine : des pièces intemporelles qui traversent les années sans prendre une ride.\n\nSon système de fermoir sécurisé et réglable permet de l'ajuster parfaitement à votre morphologie. Un bijou essentiel pour composer votre collection personnelle.`,
    ],
    BRACELETS: [
      `${title} orne votre poignet avec délicatesse. Ce bracelet allie confort et esthétique pour un résultat harmonieux. Que vous le portiez seul ou en accumulation, il saura mettre en valeur votre style personnel.\n\nFabriqué dans notre atelier avec des techniques traditionnelles revisitées, chaque bracelet est un gage de qualité et de durabilité. Son fermoir ajustable garantit un port parfait.`,
      `Découvrez ${title}, un bracelet qui célèbre l'artisanat français. Sa conception soignée en fait une pièce polyvalente, adaptée au quotidien comme aux occasions spéciales.\n\nLe design intemporel de ce bracelet lui permettra de rester un favori dans votre collection pendant des années. Résistant et confortable, il est conçu pour vous accompagner partout.`,
    ],
    ENGRAVINGS: [
      `${title} vous permet de créer un bijou unique et personnel. Nos gravures sont réalisées avec précision dans notre atelier, transformant chaque pièce en un souvenir précieux.\n\nOffrez ou offrez-vous un bijou qui raconte votre histoire. Chaque lettre, chaque mot est gravé avec soin pour créer un résultat durable et élégant.`,
      `Personnalisez votre bijou avec ${title}. Notre service de gravure artisanale garantit un rendu impeccable qui résistera au temps. Transformez une belle pièce en un trésor chargé de sens.\n\nQue ce soit pour un prénom, une date ou un message secret, nos gravures ajoutent une dimension émotionnelle unique à vos bijoux.`,
    ],
    BODY_CHAINS: [
      `${title} réinvente l'accessoirisation avec audace. Cette chaîne de corps apporte une touche bohème et sophistiquée à vos tenues estivales. Portée sur la peau ou par-dessus un vêtement, elle ne manquera pas d'attirer les regards.\n\nConçue pour s'adapter harmonieusement à votre silhouette, chaque maillon a été pensé pour offrir confort et élégance. Un bijou statement pour les esprits libres.`,
      `Osez l'originalité avec ${title}. Cette chaîne de corps délicate sublime votre décolleté ou votre dos avec grâce. Parfaite pour les événements spéciaux, elle apporte une touche unique à votre style.\n\nFabriquée avec des matériaux de qualité, elle assure un port agréable et sécurisé. Un bijou moderne qui fait la différence.`,
    ],
    PAPILLOUX: [
      `${title} capture l'essence de la légèreté et de la transformation. Inspiré par la nature, ce bijou délicat évoque la grâce des papillons. Chaque détail est finement ciselé pour créer une pièce poétique.\n\nPorté au quotidien ou lors d'occasions spéciales, ce bijou apporte une touche de féerie à votre look. Un symbole de liberté et de beauté.`,
      `Laissez-vous enchanter par ${title}, un bijou qui célèbre la beauté éphémère de la nature. Ses lignes délicates et son design aérien en font une pièce unique dans votre collection.\n\nChaque Papilloux est fabriqué avec amour dans notre atelier, alliant tradition artisanale et créativité contemporaine.`,
    ],
    HAIR_CHAINS: [
      `${title} transforme votre coiffure en œuvre d'art. Cette chaîne pour cheveux ajoute une dimension glamour à vos tresses, chignons ou cheveux lâchés. Parfaite pour les mariages, festivals ou soirées spéciales.\n\nFacile à porter et ajustable, elle se fixe délicatement sans abîmer vos cheveux. Un accessoire original qui ne passera pas inaperçu.`,
      `Sublimez votre coiffure avec ${title}. Cette chaîne délicate se glisse dans vos cheveux pour créer un look bohème chic. Inspiration vintage et touche moderne se rencontrent dans cet accessoire unique.\n\nConçue pour rester en place tout au long de la journée, elle apporte une note précieuse à votre style.`,
    ],
    KEYCHAINS: [
      `${title} allie fonctionnalité et élégance. Ce porte-clés n'est pas qu'un simple accessoire pratique : c'est un petit bijou du quotidien qui reflète votre personnalité.\n\nFabriqué avec des matériaux durables, il accompagnera vos clés pendant de longues années. Un cadeau idéal ou un plaisir à s'offrir.`,
      `Découvrez ${title}, un porte-clés qui fait la différence. Son design soigné et sa robustesse en font un compagnon fiable pour vos clés. Un accessoire qui allie praticité et esthétique.\n\nChaque porte-clés est assemblé dans notre atelier avec la même exigence de qualité que nos bijoux. Parce que les petits détails comptent.`,
    ],
  };

  const templates =
    descriptionTemplates[typeSlug] || descriptionTemplates.NECKLACES;
  return faker.helpers.arrayElement(templates);
}

function buildOrderNumber(index: number): string {
  return `TA-2025-${index.toString().padStart(6, "0")}`;
}

function generateShippingAddress() {
  const line2 = sampleBoolean(0.3) ? faker.location.secondaryAddress() : null;
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    customerEmail: faker.internet.email({ firstName, lastName }).toLowerCase(),
    customerName: `${firstName} ${lastName}`,
    shippingFirstName: firstName,
    shippingLastName: lastName,
    shippingAddress1: faker.location.streetAddress(),
    shippingAddress2: line2,
    shippingPostalCode: faker.location.zipCode("#####"),
    shippingCity: faker.location.city(),
    shippingCountry: "FR",
    shippingPhone: faker.helpers.replaceSymbols("+33 # ## ## ## ##"),
    billingFirstName: firstName,
    billingLastName: lastName,
    billingAddress1: faker.location.streetAddress(),
    billingAddress2: sampleBoolean(0.3) ? faker.location.secondaryAddress() : null,
    billingPostalCode: faker.location.zipCode("#####"),
    billingCity: faker.location.city(),
    billingCountry: "FR",
    billingPhone: faker.helpers.replaceSymbols("+33 # ## ## ## ##"),
  };
}

async function main(): Promise<void> {
  // Création des couleurs en premier
  const { colors } = await seedColorTaxonomy(prisma);

  // Créer un admin fixe pour le développement (vous pouvez changer l'email)
  const adminUser = {
    id: faker.string.nanoid(12),
    role: "ADMIN" as const,
    name: "Admin Dev",
    email: "admin@synclune.fr", // Changez ceci avec votre email si nécessaire
    emailVerified: true,
  } satisfies Prisma.UserCreateManyInput;

  const userCount = 49; // 49 + 1 admin = 50 total
  const usersData = [
    adminUser,
    ...Array.from({ length: userCount }).map((_, index) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const fullName = `${firstName} ${lastName}`;
      const emailSlug = fullName
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".");

      return {
        id: faker.string.nanoid(12),
        role: index < 4 ? "ADMIN" : "USER",
        name: fullName,
        email: `${emailSlug}${index}@synclune.fr`,
        emailVerified: sampleBoolean(0.7),
      } satisfies Prisma.UserCreateManyInput;
    }),
  ];

  await prisma.user.createMany({ data: usersData });
  const users: SeedUser[] = usersData.map((user) => ({
    ...user,
    id: user.id as string,
  }));
  const productTypes: SeedProductType[] = [];
  for (const jewelryType of SYNCLUNE_JEWELRY_TYPES) {
    const productType = await prisma.productType.create({
      data: {
        slug: jewelryType.key,
        label: jewelryType.label,
        description: jewelryType.description,
        isActive: true,
        isSystem: true,
      },
    });
    productTypes.push({
      id: productType.id,
      slug: productType.slug,
      label: productType.label,
    });
  }
  const collectionDefinitions = [
    "Été Radieux",
    "Minimaliste",
    "Cérémonie",
    "Perles Précieuses",
    "Gravure Intemporelle",
    "Iconiques",
    "Collection Mariage",
    "Modernité Dorée",
    "Héritage Précieux",
    "Jardin Secret",
    "Éclat d'Argent",
    "Renaissance",
  ];

  const collectionImages = [
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Layered necklaces
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Gold collection
    "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Elegant bracelet
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Pearl jewelry
    "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Engraved pieces
    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Diamond ring
    "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Modern jewelry
    "https://images.unsplash.com/photo-1634712282287-14ed57b9cc89?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Pendant collection
    "https://images.unsplash.com/photo-1584302179602-e4578d0ffe15?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Bangles
    "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Statement pieces
    "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Chain jewelry
    "https://images.unsplash.com/photo-1603561596112-0a132b757442?auto=format&fit=crop&w=1200&h=800&q=85&fm=webp", // Stacked rings
  ];

  const collections = [] as Array<{ id: string; name: string }>;
  for (const [index, name] of collectionDefinitions.entries()) {
    const slug = slugifyUnique("collection", name);
    const collection = await prisma.collection.create({
      data: {
        name,
        slug,
        description: faker.lorem.paragraph(),
        imageUrl: collectionImages[index % collectionImages.length],
      },
    });
    collections.push({ id: collection.id, name: collection.name });
  }

  const productsToCreate = 80;
  // Distribution des types de produits avec tous les nouveaux types (élargie pour 80 produits)
  const productTypesPool: SeedProductType[] = [
    ...Array(12).fill(productTypes[0]), // NECKLACES - Colliers
    ...Array(10).fill(productTypes[1]), // BRACELETS
    ...Array(10).fill(productTypes[2]), // RINGS - Bagues
    ...Array(8).fill(productTypes[3]), // BODY_CHAINS - Chaînes des corps
    ...Array(8).fill(productTypes[4]), // PAPILLOUX
    ...Array(8).fill(productTypes[5]), // HAIR_CHAINS - Chaînes des cheveux
    ...Array(6).fill(productTypes[6]), // KEYCHAINS - Porte-clés
    // Ajouter EARRINGS et ENGRAVINGS si ils existent (compatibilité)
    ...Array(18).fill(
      productTypes.find((t) => t.slug === "EARRINGS") || productTypes[0],
    ),
  ].filter(Boolean); // Enlever les undefined
  const shuffledTypes = faker.helpers
    .shuffle(productTypesPool)
    .slice(0, productsToCreate);

  const statusPool: ProductStatus[] = [
    ...Array(60).fill(ProductStatus.PUBLIC),
    ...Array(15).fill(ProductStatus.DRAFT),
    ...Array(5).fill(ProductStatus.ARCHIVED),
  ];
  const shuffledStatuses = faker.helpers.shuffle(statusPool);

  const variantlessIndexes = new Set<number>(
    faker.helpers
      .shuffle(Array.from({ length: productsToCreate }, (_, i) => i))
      .slice(0, Math.floor(productsToCreate * 0.25)),
  );

  const seedProducts: SeedProduct[] = [];
  const seedSkus: SeedSku[] = [];
  for (let i = 0; i < productsToCreate; i += 1) {
    const type = shuffledTypes[i] ?? faker.helpers.arrayElement(productTypes);
    const status = shuffledStatuses[i] ?? ProductStatus.PUBLIC;
    const hasSkus = !variantlessIndexes.has(i);

    const title = generateProductTitle(type.slug);
    const slug = slugifyUnique("product", `${title}`);

    const product = await prisma.product.create({
      data: {
        slug,
        title,
        description: generateProductDescription(type.slug, title),
        typeId: type.id,
        status,
      },
    });

    // Les images sont maintenant gérées au niveau des SKUs
    // La logique d'image principale sera définie via defaultSku

    // Initialiser le tableau des SKUs pour ce produit
    const productSkus: Array<{
      id: string;
      productId: string;
      price: number;
      priceInclTax: number;
      sku: string;
      isActive: boolean;
      colorId: string;
      material?: string;
    }> = [];

    // Créer des SKUs (ProductSku) - système simplifié
    // Toujours créer au moins 1 SKU (requis pour OrderItem)
    if (hasSkus || true) {
      const skuCount = hasSkus ? faker.number.int({ min: 1, max: 4 }) : 1;
      for (let skuIndex = 0; skuIndex < skuCount; skuIndex++) {
        const skuColor = faker.helpers.arrayElement(colors);
        const skuPrice = euroCents(1200, 75000);

        let skuCode = `${slug.toUpperCase()}-${skuIndex + 1}`;
        while (usedSkus.has(skuCode)) {
          skuCode = `${slug.toUpperCase()}-${faker.string.alphanumeric({
            length: 3,
            casing: "upper",
          })}`;
        }
        usedSkus.add(skuCode);

        // Système de tailles flexible selon le type
        let sizeData: { size?: string; dimensions?: string } = {};
        if (type.slug === "RINGS") {
          const ringSize = faker.helpers.arrayElement([
            "48",
            "50",
            "52",
            "54",
            "56",
            "58",
            "60",
            "Ajustable",
          ]);
          sizeData = {
            size: ringSize,
            dimensions: `Taille ${ringSize}`,
          };
        } else if (type.slug === "NECKLACES") {
          const necklaceLength = faker.helpers.arrayElement([
            "40cm",
            "45cm",
            "50cm",
            "55cm",
            "Sur mesure",
          ]);
          sizeData = {
            size: necklaceLength,
            dimensions: `Longueur ${necklaceLength}`,
          };
        } else if (type.slug === "BRACELETS") {
          const braceletSize = faker.helpers.arrayElement([
            "16cm",
            "17cm",
            "18cm",
            "19cm",
            "20cm",
            "Ajustable",
          ]);
          sizeData = {
            size: braceletSize,
            dimensions: `Longueur ${braceletSize}`,
          };
        } else {
          // EARRINGS, BROOCHES, etc. - pas de taille
          sizeData = {
            size: "Taille unique",
            dimensions: "Taille unique",
          };
        }

        // Pick a random material name as string
        const materialText = faker.helpers.arrayElement(MATERIAL_NAMES);
        const priceInclTax = skuPrice;

        const sku = await prisma.productSku.create({
          data: {
            sku: skuCode,
            productId: product.id,
            colorId: skuColor.id,
            material: materialText,
            priceInclTax,
            inventory: faker.number.int({ min: 0, max: 50 }),
            isActive: sampleBoolean(0.85),
            // Système de tailles
            size: sizeData.size || null,
          },
        });

        // Images pour le SKU
        const skuImageCount = faker.number.int({ min: 2, max: 4 });
        for (let imgIndex = 0; imgIndex < skuImageCount; imgIndex++) {
          await prisma.skuMedia.create({
            data: {
              skuId: sku.id,
              url: getJewelryImageUrl(
                type.slug,
                imgIndex,
                `${slug}-sku-${skuIndex}`,
              ),
              altText: `${product.title} ${skuColor.name} - Vue ${
                imgIndex + 1
              }`,
              mediaType: "IMAGE", // Seed data uses only images
              isPrimary: imgIndex === 0,
            },
          });
        }

        // Ajouter au tableau global
        seedSkus.push({
          id: sku.id,
          productId: product.id,
          price: priceInclTax,
          priceInclTax,
          sku: sku.sku,
          isActive: sku.isActive,
          colorId: skuColor.id,
          material: materialText,
        });

        // Ajouter aussi au tableau local du produit
        productSkus.push({
          id: sku.id,
          productId: product.id,
          price: priceInclTax,
          priceInclTax,
          sku: sku.sku,
          isActive: sku.isActive,
          colorId: skuColor.id,
          material: materialText,
        });
      }
    }

    // Définir un defaultSku pour le produit (le premier SKU actif créé)
    if (productSkus.length > 0) {
      const defaultSkuCandidate =
        productSkus
          .filter((sku) => sku.isActive)
          .sort((a, b) => a.price - b.price)[0] || productSkus[0]; // Premier actif par prix, ou premier tout court

      if (defaultSkuCandidate) {
        // Marquer ce SKU comme default
        await prisma.productSku.update({
          where: { id: defaultSkuCandidate.id },
          data: {
            isDefault: true,
          },
        });
      }
    }

    // Assign product to a collection directly (simplified - no junction table)
    const shouldHaveCollection = faker.number.float({ min: 0, max: 1 }) > 0.3;
    if (shouldHaveCollection) {
      const selectedCollection = faker.helpers.arrayElement(collections);
      await prisma.product.update({
        where: { id: product.id },
        data: {
          collectionId: selectedCollection.id,
        },
      });
    }

    // Simplification: plus de customization fields complexes

    seedProducts.push({
      id: product.id,
      title: product.title,
      slug: product.slug,
      typeId: type.id,
      typeSlug: type.slug,
    });
  }

  const ordersToCreate = 100;
  const orders: string[] = [];

  for (let i = 0; i < ordersToCreate; i += 1) {
    const customer = sampleBoolean(0.85)
      ? faker.helpers.arrayElement(users)
      : null;
    const customerId = customer?.id ?? null;
    const orderItemsCount = faker.number.int({ min: 1, max: 4 });
    const itemsData: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
    let subtotal = 0;
    let taxTotal = 0;

    for (let itemIndex = 0; itemIndex < orderItemsCount; itemIndex += 1) {
      const product = faker.helpers.arrayElement(seedProducts);

      // Trouver un SKU pour ce produit
      const skusForProduct = seedSkus.filter(
        (sku) => sku.productId === product.id,
      );
      const activeSku =
        skusForProduct.find((sku) => sku.isActive) || skusForProduct[0];

      if (!activeSku) {
        // Si pas de SKU, on skip cet item (skuId est requis)
        continue;
      }

      const quantity = faker.number.int({ min: 1, max: 3 });
      const lineAmount = activeSku.priceInclTax * quantity;
      subtotal += lineAmount;
      // Calcul TVA: TTC contient déjà la TVA, donc TVA = TTC - HT = TTC - (TTC/1.20)
      const lineTaxAmount = Math.round(lineAmount - lineAmount / 1.2);
      taxTotal += lineTaxAmount;

      // Récupérer les détails du SKU pour extraire les champs dénormalisés
      const skuDetails = await prisma.productSku.findUnique({
        where: { id: activeSku.id },
        include: {
          color: { select: { name: true } },
          images: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },
        },
      });

      itemsData.push({
        productId: product.id,
        skuId: activeSku.id,
        productTitle: product.title,
        skuColor: skuDetails?.color?.name || null,
        skuMaterial: skuDetails?.material || null,
        skuSize: skuDetails?.size || null,
        skuImageUrl: skuDetails?.images?.[0]?.url || null,
        price: activeSku.priceInclTax,
        quantity,
      });

      if (customerId) {
        const set = purchases.userProduct.get(customerId) ?? new Set<string>();
        set.add(product.id);
        purchases.userProduct.set(customerId, set);
      }
    }

    if (itemsData.length === 0) {
      continue;
    }

    const shipping = faker.helpers.arrayElement([0, 500, 800, 1200]);
    const tax = taxTotal;
    const total = subtotal + shipping + tax;
    const status = faker.helpers.weightedArrayElement([
      { weight: 3, value: OrderStatus.PENDING },
      { weight: 4, value: OrderStatus.PROCESSING },
      { weight: 6, value: OrderStatus.SHIPPED },
      { weight: 7, value: OrderStatus.DELIVERED },
      { weight: 2, value: OrderStatus.CANCELLED },
    ]);

    // Payment status en fonction de l'order status
    const paymentStatus =
      status === OrderStatus.CANCELLED
        ? PaymentStatus.FAILED
        : status === OrderStatus.PENDING
          ? PaymentStatus.PENDING
          : PaymentStatus.PAID;

    // Ajouter les informations de tracking directement sur Order
    let trackingData = {};
    if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
      const shippingMethod = faker.helpers.arrayElement([
        "Colissimo",
        "Mondial Relay",
        "Chronopost",
        "Lettre suivie",
      ]);

      const shippedAt = faker.date.recent({ days: 20 });

      trackingData = {
        shippingMethod,
        trackingNumber: `${faker.string.alphanumeric({ length: 12, casing: "upper" })}`,
        shippedAt,
      };
    }

    const shippingData = generateShippingAddress();

    const order = await prisma.order.create({
      data: {
        orderNumber: buildOrderNumber(i + 1),
        user: customerId ? { connect: { id: customerId } } : undefined,
        subtotal,
        shippingCost: shipping,
        taxAmount: tax,
        total,
        status,
        ...shippingData,
        paymentStatus,
        paidAt:
          paymentStatus === PaymentStatus.PAID
            ? faker.date.recent({ days: 30 })
            : null,
        ...trackingData,
        items: {
          create: itemsData,
        },
      },
    });

    orders.push(order.id);
  }

  // Note: Système de personnalisation supprimé - non nécessaire pour le moment
  // Note: Système de wishlist supprimé - sera ajouté en v2 si nécessaire
  // Note: PriceHistory supprimé - sera rajouté en v2 si nécessaire

  // ============================================
  // SESSIONS ET COMPTES (Auth)
  // ============================================
  let sessionCount = 0;
  let accountCount = 0;

  // Créer des sessions pour 20 utilisateurs connectés
  for (const user of users.slice(0, 20)) {
    await prisma.session.create({
      data: {
        id: faker.string.nanoid(12),
        user: { connect: { id: user.id } },
        token: faker.string.alphanumeric({ length: 32 }),
        expiresAt: faker.date.future({ years: 0.1 }),
        ipAddress: faker.internet.ipv4(),
        userAgent: faker.internet.userAgent(),
      },
    });
    sessionCount++;
  }

  // Créer des comptes OAuth pour certains utilisateurs
  for (const user of users.slice(0, 15)) {
    const provider = faker.helpers.arrayElement([
      "google",
      "github",
      "facebook",
    ]);
    await prisma.account.create({
      data: {
        id: faker.string.nanoid(12),
        user: { connect: { id: user.id } },
        providerId: provider,
        accountId: `${provider}_${faker.string.alphanumeric({ length: 16 })}`,
        accessToken: faker.string.alphanumeric({ length: 40 }),
        refreshToken: sampleBoolean(0.5)
          ? faker.string.alphanumeric({ length: 40 })
          : null,
        accessTokenExpiresAt: faker.date.future({ years: 0.05 }),
        scope: "email profile",
      },
    });
    accountCount++;
  }

  // ============================================
  // VERIFICATIONS (Email tokens)
  // ============================================
  let verificationCount = 0;

  // Créer des tokens de vérification pour les utilisateurs non vérifiés
  const unverifiedUsers = users.filter((u) => !u.emailVerified);
  for (const user of unverifiedUsers.slice(0, 10)) {
    await prisma.verification.create({
      data: {
        id: faker.string.nanoid(12),
        identifier: user.email,
        value: faker.string.alphanumeric({ length: 32 }),
        expiresAt: faker.date.soon({ days: 7 }),
      },
    });
    verificationCount++;
  }
}

main()
  .catch((error) => {
    console.error("Erreur lors de l'exécution du seed :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
