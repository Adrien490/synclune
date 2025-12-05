import { fakerFR } from "@faker-js/faker";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
  CollectionStatus,
  FulfillmentStatus,
  MediaType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
} from "../app/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const faker = fakerFR;
faker.seed(42);

function sampleBoolean(probability: number): boolean {
  return (
    faker.number.float({ min: 0, max: 1, fractionDigits: 4 }) < probability
  );
}

function buildOrderNumber(index: number): string {
  return `SYN-2025-${index.toString().padStart(6, "0")}`;
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

function randomNovember2025Date(): Date {
  const day = faker.number.int({ min: 1, max: 28 });
  const hour = faker.number.int({ min: 8, max: 22 });
  const minute = faker.number.int({ min: 0, max: 59 });
  return new Date(2025, 10, day, hour, minute);
}

async function updateProductDenormalizedFields(productId: string) {
  const skus = await prisma.productSku.findMany({
    where: { productId, isActive: true, deletedAt: null },
    select: { priceInclTax: true, inventory: true },
  });

  if (skus.length === 0) return;

  const prices = skus.map((s) => s.priceInclTax);
  const totalInventory = skus.reduce((sum, s) => sum + s.inventory, 0);

  await prisma.product.update({
    where: { id: productId },
    data: {
      minPriceInclTax: Math.min(...prices),
      maxPriceInclTax: Math.max(...prices),
      totalInventory,
    },
  });
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
  { slug: "acier-inoxydable", name: "Acier inoxydable", description: "Résistant et hypoallergénique" },
  { slug: "plaque-or", name: "Plaqué or", description: "Finition dorée élégante" },
  { slug: "argent-925", name: "Argent 925", description: "Argent sterling de qualité" },
  { slug: "laiton", name: "Laiton", description: "Alliage cuivre-zinc vintage" },
  { slug: "perles-naturelles", name: "Perles naturelles", description: "Perles d'eau douce" },
  { slug: "cristal-swarovski", name: "Cristal Swarovski", description: "Cristaux autrichiens" },
];

const productTypesData: Prisma.ProductTypeCreateManyInput[] = [
  { slug: "colliers", label: "Colliers", description: "Ornez votre décolleté avec nos colliers artisanaux", isSystem: true },
  { slug: "bracelets", label: "Bracelets", description: "Bracelets délicats pour votre poignet", isSystem: true },
  { slug: "bagues", label: "Bagues", description: "Bagues uniques, symboles de beauté", isSystem: true },
  { slug: "chaines-corps", label: "Chaînes de corps", description: "Sublimez votre silhouette", isSystem: true },
  { slug: "papilloux", label: "Papilloux", description: "Bijoux papillons pour le visage", isSystem: true },
  { slug: "chaines-cheveux", label: "Chaînes de cheveux", description: "Accessoires capillaires précieux", isSystem: true },
  { slug: "porte-cles", label: "Porte-clés", description: "Petits bijoux du quotidien", isSystem: true },
];

const collectionsData: Prisma.CollectionCreateManyInput[] = [
  { slug: "nouveautes", name: "Nouveautés", description: "Nos dernières créations", status: CollectionStatus.PUBLIC },
  { slug: "best-sellers", name: "Best Sellers", description: "Les favoris de nos clientes", status: CollectionStatus.PUBLIC },
  { slug: "mariage", name: "Mariage", description: "Pour le plus beau jour de votre vie", status: CollectionStatus.PUBLIC },
  { slug: "fetes", name: "Fêtes", description: "Brillez pour les occasions spéciales", status: CollectionStatus.PUBLIC },
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
    "https://images.unsplash.com/photo-1618215228621-b48c42f8a2dd?w=800&h=800&fit=crop&crop=center",
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
    "https://images.unsplash.com/photo-1594736797933-d0d8aa06a2d8?w=800&h=800&fit=crop&crop=center",
    "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=800&h=800&fit=crop&crop=center",
    "https://images.unsplash.com/photo-1576022162028-3bf61f2f7b8e?w=800&h=800&fit=crop&crop=center",
  ],
  chainesCheveux: [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&crop=center",
    "https://images.unsplash.com/photo-1590548784585-643d2b9f2925?w=800&h=800&fit=crop&crop=center",
  ],
  porteCles: [
    "https://images.unsplash.com/photo-1558618047-8c90d7e75e03?w=800&h=800&fit=crop&crop=center",
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
    description: "Un collier délicat orné d'un pendentif lune en plaqué or, symbole de féminité et de mystère.",
    typeSlug: "colliers",
    imageCategory: "colliers",
    collections: ["nouveautes", "best-sellers"],
    skus: [
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 4990, inventory: 25, isDefault: true },
      { colorSlug: "or-rose", materialSlug: "plaque-or", price: 4990, inventory: 18 },
      { colorSlug: "argent", materialSlug: "argent-925", price: 5990, inventory: 12 },
    ],
  },
  {
    slug: "collier-perles-eternelles",
    title: "Collier Perles Éternelles",
    description: "Un collier classique de perles d'eau douce, raffinement intemporel pour toutes les occasions.",
    typeSlug: "colliers",
    imageCategory: "colliers",
    collections: ["mariage", "best-sellers"],
    skus: [
      { colorSlug: "perle", materialSlug: "perles-naturelles", price: 8990, inventory: 15, isDefault: true },
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
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 7990, inventory: 20, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", price: 2990, inventory: 35, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 3990, inventory: 22, isDefault: true },
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
      { colorSlug: "perle", materialSlug: "perles-naturelles", price: 4990, inventory: 20, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", price: 3490, inventory: 25, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "laiton", price: 4490, inventory: 15, isDefault: true },
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
      { colorSlug: "or-blanc", materialSlug: "argent-925", size: "52", price: 6990, inventory: 8, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", size: "52", price: 1990, inventory: 30, isDefault: true },
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", size: "54", price: 1990, inventory: 28 },
      { colorSlug: "or-rose", materialSlug: "acier-inoxydable", size: "52", price: 1990, inventory: 25 },
      { colorSlug: "or-rose", materialSlug: "acier-inoxydable", size: "54", price: 1990, inventory: 22 },
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
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", size: "52", price: 5490, inventory: 12, isDefault: true },
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", size: "54", price: 5490, inventory: 10 },
      { colorSlug: "emeraude", materialSlug: "cristal-swarovski", size: "54", price: 5990, inventory: 8 },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", size: "56", price: 4990, inventory: 15, isDefault: true },
      { colorSlug: "argent", materialSlug: "argent-925", size: "56", price: 5490, inventory: 12 },
      { colorSlug: "noir", materialSlug: "acier-inoxydable", size: "58", price: 3990, inventory: 18 },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 6990, inventory: 10, isDefault: true },
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
      { colorSlug: "perle", materialSlug: "perles-naturelles", price: 8990, inventory: 8, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", price: 7490, inventory: 10, isDefault: true },
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
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 3990, inventory: 20, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 3490, inventory: 25, isDefault: true },
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
      { colorSlug: "emeraude", materialSlug: "cristal-swarovski", price: 4490, inventory: 12, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 4990, inventory: 15, isDefault: true },
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
      { colorSlug: "perle", materialSlug: "perles-naturelles", price: 6990, inventory: 12, isDefault: true },
      { colorSlug: "or-blanc", materialSlug: "perles-naturelles", price: 7490, inventory: 8 },
    ],
  },
  // PORTE-CLÉS (2)
  {
    slug: "porte-cles-coeur",
    title: "Porte-Clés Cœur",
    description: "Un porte-clés en forme de cœur, petit bijou du quotidien.",
    typeSlug: "porte-cles",
    imageCategory: "porteCles",
    collections: ["nouveautes"],
    skus: [
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", price: 1990, inventory: 40, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 2490, inventory: 30, isDefault: true },
      { colorSlug: "argent", materialSlug: "argent-925", price: 2990, inventory: 25 },
    ],
  },
];

async function main(): Promise<void> {
  console.log("🌱 Démarrage du seed...");

  // ============================================
  // COULEURS
  // ============================================
  await prisma.color.createMany({ data: colorsData, skipDuplicates: true });
  const colors = await prisma.color.findMany();
  const colorMap = new Map(colors.map((c) => [c.slug, c.id]));
  console.log(`✅ ${colors.length} couleurs créées/existantes`);

  // ============================================
  // MATÉRIAUX
  // ============================================
  await prisma.material.createMany({ data: materialsData, skipDuplicates: true });
  const materials = await prisma.material.findMany();
  const materialMap = new Map(materials.map((m) => [m.slug, m.id]));
  console.log(`✅ ${materials.length} matériaux créés/existants`);

  // ============================================
  // TYPES DE PRODUITS
  // ============================================
  await prisma.productType.createMany({ data: productTypesData, skipDuplicates: true });
  const productTypes = await prisma.productType.findMany();
  const productTypeMap = new Map(productTypes.map((pt) => [pt.slug, pt.id]));
  console.log(`✅ ${productTypes.length} types de produits créés/existants`);

  // ============================================
  // COLLECTIONS
  // ============================================
  await prisma.collection.createMany({ data: collectionsData, skipDuplicates: true });
  const collections = await prisma.collection.findMany();
  const collectionMap = new Map(collections.map((c) => [c.slug, c.id]));
  console.log(`✅ ${collections.length} collections créées/existantes`);

  // ============================================
  // PRODUITS AVEC SKUS ET IMAGES
  // ============================================
  let productsCreated = 0;
  const createdProductIds: string[] = [];

  for (const productData of productsData) {
    const existingProduct = await prisma.product.findUnique({
      where: { slug: productData.slug },
    });

    if (existingProduct) {
      createdProductIds.push(existingProduct.id);
      continue;
    }

    const typeId = productTypeMap.get(productData.typeSlug);
    const images = jewelryImages[productData.imageCategory];

    const product = await prisma.product.create({
      data: {
        slug: productData.slug,
        title: productData.title,
        description: productData.description,
        status: ProductStatus.PUBLIC,
        typeId,
        skus: {
          create: productData.skus.map((skuData, index) => {
            const skuCode = `${productData.slug.toUpperCase().replace(/-/g, "")}-${skuData.colorSlug.toUpperCase().replace(/-/g, "")}-${index + 1}`;
            const imageUrl = images[index % images.length];

            return {
              sku: skuCode,
              colorId: colorMap.get(skuData.colorSlug)!,
              materialId: materialMap.get(skuData.materialSlug)!,
              size: skuData.size || null,
              priceInclTax: skuData.price,
              inventory: skuData.inventory,
              isActive: true,
              isDefault: skuData.isDefault || false,
              images: {
                create: [
                  {
                    url: imageUrl,
                    altText: `${productData.title} - ${skuData.colorSlug}`,
                    mediaType: MediaType.IMAGE,
                    isPrimary: true,
                  },
                ],
              },
            };
          }),
        },
      },
    });

    createdProductIds.push(product.id);
    productsCreated++;
  }

  console.log(`✅ ${productsCreated} produits créés (${productsData.length - productsCreated} existants)`);

  // ============================================
  // LIENS PRODUIT-COLLECTION
  // ============================================
  let linksCreated = 0;

  for (const productData of productsData) {
    const product = await prisma.product.findUnique({
      where: { slug: productData.slug },
    });

    if (!product) continue;

    for (const collectionSlug of productData.collections) {
      const collectionId = collectionMap.get(collectionSlug);
      if (!collectionId) continue;

      const existingLink = await prisma.productCollection.findUnique({
        where: {
          productId_collectionId: {
            productId: product.id,
            collectionId,
          },
        },
      });

      if (!existingLink) {
        const isFeatured = productData.collections.indexOf(collectionSlug) === 0;
        await prisma.productCollection.create({
          data: {
            productId: product.id,
            collectionId,
            isFeatured,
          },
        });
        linksCreated++;
      }
    }
  }

  console.log(`✅ ${linksCreated} liens produit-collection créés`);

  // ============================================
  // MISE À JOUR CHAMPS DÉNORMALISÉS
  // ============================================
  for (const productId of createdProductIds) {
    await updateProductDenormalizedFields(productId);
  }
  console.log(`✅ Champs dénormalisés mis à jour pour ${createdProductIds.length} produits`);

  // ============================================
  // UTILISATEURS
  // ============================================
  const adminUser = {
    id: faker.string.nanoid(12),
    role: "ADMIN" as const,
    name: "Admin Dev",
    email: "admin@synclune.fr",
    emailVerified: true,
  } satisfies Prisma.UserCreateManyInput;

  const userCount = 29;
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
        role: index < 2 ? "ADMIN" : "USER",
        name: fullName,
        email: `${emailSlug}${index}@synclune.fr`,
        emailVerified: sampleBoolean(0.7),
      } satisfies Prisma.UserCreateManyInput;
    }),
  ];

  await prisma.user.createMany({ data: usersData, skipDuplicates: true });
  console.log(`✅ ${usersData.length} utilisateurs créés`);

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
    },
  });

  if (existingProducts.length === 0) {
    console.log("⚠️ Aucun produit PUBLIC avec stock trouvé. Pas de commandes créées.");
    console.log("   Créez d'abord des produits via l'admin avant de relancer le seed.");
    return;
  }

  console.log(`📦 ${existingProducts.length} produits disponibles pour les commandes`);

  const ordersToCreate = 50;
  let ordersCreated = 0;

  for (let i = 0; i < ordersToCreate; i += 1) {
    const customer = sampleBoolean(0.85)
      ? faker.helpers.arrayElement(usersData)
      : null;
    const customerId = customer?.id ?? null;
    const orderItemsCount = faker.number.int({ min: 1, max: 3 });
    const itemsData: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
    let subtotal = 0;
    let taxTotal = 0;

    for (let itemIndex = 0; itemIndex < orderItemsCount; itemIndex += 1) {
      const product = faker.helpers.arrayElement(existingProducts);
      const sku = faker.helpers.arrayElement(product.skus);

      if (!sku) continue;

      const quantity = faker.number.int({ min: 1, max: 2 });
      const lineAmount = sku.priceInclTax * quantity;
      subtotal += lineAmount;
      const lineTaxAmount = Math.round(lineAmount - lineAmount / 1.2);
      taxTotal += lineTaxAmount;

      itemsData.push({
        productId: product.id,
        skuId: sku.id,
        productTitle: product.title,
        skuColor: sku.color?.name || null,
        skuMaterial: sku.material?.name || null,
        skuSize: sku.size || null,
        skuImageUrl: sku.images?.[0]?.url || null,
        price: sku.priceInclTax,
        quantity,
      });
    }

    if (itemsData.length === 0) continue;

    const shipping = faker.helpers.arrayElement([0, 499, 699, 899]);
    const total = subtotal + shipping;

    const status = faker.helpers.weightedArrayElement([
      { weight: 2, value: OrderStatus.PENDING },
      { weight: 3, value: OrderStatus.PROCESSING },
      { weight: 4, value: OrderStatus.SHIPPED },
      { weight: 8, value: OrderStatus.DELIVERED },
      { weight: 1, value: OrderStatus.CANCELLED },
    ]);

    const paymentStatus =
      status === OrderStatus.CANCELLED
        ? PaymentStatus.REFUNDED
        : status === OrderStatus.PENDING
          ? PaymentStatus.PENDING
          : PaymentStatus.PAID;

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

    const orderDate = randomNovember2025Date();

    let trackingData: Partial<Prisma.OrderCreateInput> = {};
    if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
      const shippingMethod = faker.helpers.arrayElement([
        "STANDARD",
        "EXPRESS",
        "STANDARD",
        "STANDARD",
      ] as const);

      const shippedAt = new Date(orderDate);
      shippedAt.setDate(shippedAt.getDate() + faker.number.int({ min: 1, max: 3 }));

      trackingData = {
        shippingMethod,
        trackingNumber: faker.string.alphanumeric({ length: 13, casing: "upper" }),
        trackingUrl: `https://www.laposte.fr/outils/suivre-vos-envois?code=${faker.string.alphanumeric({ length: 13, casing: "upper" })}`,
        shippedAt,
      };
    }

    const shippingData = generateShippingAddress();

    await prisma.order.create({
      data: {
        orderNumber: buildOrderNumber(i + 1),
        user: customerId ? { connect: { id: customerId } } : undefined,
        subtotal,
        shippingCost: shipping,
        taxAmount: taxTotal,
        total,
        status,
        paymentStatus,
        fulfillmentStatus,
        ...shippingData,
        paidAt: paymentStatus === PaymentStatus.PAID ? orderDate : null,
        createdAt: orderDate,
        updatedAt: orderDate,
        ...trackingData,
        items: {
          create: itemsData,
        },
      },
    });

    ordersCreated++;
  }

  console.log(`✅ ${ordersCreated} commandes créées (novembre 2025)`);

  // ============================================
  // SESSIONS (pour les utilisateurs)
  // ============================================
  for (const user of usersData.slice(0, 10)) {
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
  }
  console.log("✅ Sessions créées");

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
