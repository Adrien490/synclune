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
  ReviewStatus,
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

// Préfixe unique pour cette exécution du seed (évite les conflits si relancé)
const seedTimestamp = Date.now().toString(36).toUpperCase();

function buildOrderNumber(index: number): string {
  return `SYN-${seedTimestamp}-${index.toString().padStart(4, "0")}`;
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
  };
}

function randomNovember2025Date(): Date {
  const day = faker.number.int({ min: 1, max: 28 });
  const hour = faker.number.int({ min: 8, max: 22 });
  const minute = faker.number.int({ min: 0, max: 59 });
  return new Date(2025, 10, day, hour, minute);
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
  // PORTE-CLÉS (4)
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
  {
    slug: "porte-cles-trefle",
    title: "Porte-Clés Trèfle Chance",
    description: "Un trèfle à quatre feuilles pour porter chance au quotidien.",
    typeSlug: "porte-cles",
    imageCategory: "porteCles",
    collections: ["nouveautes", "best-sellers"],
    skus: [
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 2290, inventory: 35, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", price: 1790, inventory: 50, isDefault: true },
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
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 5490, inventory: 18, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 4490, inventory: 22, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 3990, inventory: 25, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "laiton", price: 5990, inventory: 12, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 3490, inventory: 28, isDefault: true },
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
      { colorSlug: "or-rose", materialSlug: "plaque-or", price: 4790, inventory: 18, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 3790, inventory: 20, isDefault: true },
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
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 7990, inventory: 10, isDefault: true },
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
      { colorSlug: "argent", materialSlug: "acier-inoxydable", price: 2990, inventory: 30, isDefault: true },
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
      { colorSlug: "perle", materialSlug: "perles-naturelles", price: 2490, inventory: 35, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 5490, inventory: 12, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 3290, inventory: 25, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", size: "52", price: 2990, inventory: 20, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", size: "52", price: 3490, inventory: 16, isDefault: true },
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
      { colorSlug: "perle", materialSlug: "perles-naturelles", size: "52", price: 5990, inventory: 10, isDefault: true },
      { colorSlug: "perle", materialSlug: "perles-naturelles", size: "54", price: 5990, inventory: 12 },
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
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", size: "54", price: 2790, inventory: 22, isDefault: true },
      { colorSlug: "argent", materialSlug: "acier-inoxydable", size: "54", price: 2790, inventory: 20 },
      { colorSlug: "or-rose", materialSlug: "acier-inoxydable", size: "54", price: 2790, inventory: 18 },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", size: "52", price: 4290, inventory: 14, isDefault: true },
      { colorSlug: "or-jaune", materialSlug: "plaque-or", size: "54", price: 4290, inventory: 16 },
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", size: "52", price: 5490, inventory: 10 },
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
      { colorSlug: "argent", materialSlug: "argent-925", size: "52", price: 3990, inventory: 18, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 7490, inventory: 8, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", price: 4990, inventory: 15, isDefault: true },
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
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 9990, inventory: 6, isDefault: true },
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
      { colorSlug: "perle", materialSlug: "perles-naturelles", price: 4990, inventory: 12, isDefault: true },
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
      { colorSlug: "argent", materialSlug: "argent-925", price: 4290, inventory: 18, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 5990, inventory: 10, isDefault: true },
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
      { colorSlug: "cristal", materialSlug: "cristal-swarovski", price: 6990, inventory: 10, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 5490, inventory: 14, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "acier-inoxydable", price: 3990, inventory: 20, isDefault: true },
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
      { colorSlug: "or-jaune", materialSlug: "plaque-or", price: 4290, inventory: 16, isDefault: true },
      { colorSlug: "argent", materialSlug: "argent-925", price: 4790, inventory: 14 },
      { colorSlug: "or-rose", materialSlug: "plaque-or", price: 4290, inventory: 15 },
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

  // ============================================
  // TÉMOIGNAGES
  // ============================================
  const testimonialsData: Prisma.TestimonialCreateManyInput[] = [
    {
      authorName: "Marie",
      content: "J'ai reçu mon collier Lune Céleste pour mon anniversaire et je ne le quitte plus ! La qualité est exceptionnelle et il attire toujours des compliments. Merci Synclune pour cette petite merveille.",
      imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=600&fit=crop&crop=center",
      isPublished: true,
    },
    {
      authorName: "Sophie",
      content: "Le bracelet perles fines que j'ai commandé pour mon mariage était parfait. Livraison rapide, emballage soigné et le bijou encore plus beau en vrai qu'en photo. Je recommande à 100% !",
      imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&h=600&fit=crop&crop=center",
      isPublished: true,
    },
    {
      authorName: "Camille",
      content: "Coup de cœur pour les papilloux ! C'est original, élégant et ça change des bijoux classiques. J'en ai commandé plusieurs pour offrir à mes amies, elles ont adoré.",
      imageUrl: "https://images.unsplash.com/photo-1594736797933-d0d8aa06a2d8?w=600&h=600&fit=crop&crop=center",
      isPublished: true,
    },
  ];

  await prisma.testimonial.createMany({ data: testimonialsData, skipDuplicates: true });
  console.log(`✅ ${testimonialsData.length} témoignages créés`);

  // ============================================
  // AVIS PRODUITS (REVIEWS)
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
    negative: [
      "Déçue",
      "Pas à la hauteur",
      "Qualité décevante",
    ],
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

  // Récupérer les commandes DELIVERED avec leurs items et users
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

  let reviewsCreated = 0;
  const reviewedPairs = new Set<string>(); // Pour éviter les doublons userId-productId

  for (const order of deliveredOrders) {
    if (!order.userId || !order.user) continue;

    // 70% de chance de laisser un avis sur une commande
    if (!sampleBoolean(0.7)) continue;

    for (const item of order.items) {
      if (!item.productId) continue;

      const pairKey = `${order.userId}-${item.productId}`;

      // Vérifier si cet utilisateur a déjà laissé un avis pour ce produit
      if (reviewedPairs.has(pairKey)) continue;

      // Vérifier aussi en base de données
      const existingReview = await prisma.productReview.findUnique({
        where: {
          userId_productId: {
            userId: order.userId,
            productId: item.productId,
          },
        },
      });

      if (existingReview) {
        reviewedPairs.add(pairKey);
        continue;
      }

      // Vérifier si cet orderItem a déjà un avis
      const existingOrderItemReview = await prisma.productReview.findUnique({
        where: { orderItemId: item.id },
      });

      if (existingOrderItemReview) {
        reviewedPairs.add(pairKey);
        continue;
      }

      // 60% de chance de laisser un avis sur un article spécifique
      if (!sampleBoolean(0.6)) continue;

      // Distribution réaliste des notes (majorité positive)
      const rating = faker.helpers.weightedArrayElement([
        { weight: 2, value: 5 },  // 5 étoiles - très fréquent
        { weight: 3, value: 4 },  // 4 étoiles - le plus fréquent
        { weight: 1, value: 3 },  // 3 étoiles - occasionnel
        { weight: 0.3, value: 2 }, // 2 étoiles - rare
        { weight: 0.1, value: 1 }, // 1 étoile - très rare
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

      const hasTitle = sampleBoolean(0.7); // 70% des avis ont un titre
      const title = hasTitle ? faker.helpers.arrayElement(titlePool) : null;
      const content = faker.helpers.arrayElement(contentPool);

      // Date de l'avis : entre 1 et 14 jours après la commande
      const reviewDate = new Date(order.createdAt);
      reviewDate.setDate(reviewDate.getDate() + faker.number.int({ min: 1, max: 14 }));

      // Status : 95% publiés, 5% masqués
      const status = sampleBoolean(0.95) ? ReviewStatus.PUBLISHED : ReviewStatus.HIDDEN;

      try {
        await prisma.productReview.create({
          data: {
            productId: item.productId,
            userId: order.userId,
            orderItemId: item.id,
            rating,
            title,
            content,
            status,
            createdAt: reviewDate,
            updatedAt: reviewDate,
          },
        });

        reviewedPairs.add(pairKey);
        reviewsCreated++;
      } catch {
        // Ignore les erreurs de contrainte unique
        continue;
      }
    }
  }

  console.log(`✅ ${reviewsCreated} avis créés`);

  // ============================================
  // MISE À JOUR DES STATS DES REVIEWS
  // ============================================
  const productsWithReviews = await prisma.product.findMany({
    where: {
      reviews: {
        some: {
          status: ReviewStatus.PUBLISHED,
          deletedAt: null,
        },
      },
    },
    select: { id: true },
  });

  for (const product of productsWithReviews) {
    const reviews = await prisma.productReview.findMany({
      where: {
        productId: product.id,
        status: ReviewStatus.PUBLISHED,
        deletedAt: null,
      },
      select: { rating: true },
    });

    const totalCount = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalCount > 0 ? sumRatings / totalCount : 0;

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      ratingCounts[review.rating as keyof typeof ratingCounts]++;
    }

    await prisma.productReviewStats.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        totalCount,
        averageRating,
        rating1Count: ratingCounts[1],
        rating2Count: ratingCounts[2],
        rating3Count: ratingCounts[3],
        rating4Count: ratingCounts[4],
        rating5Count: ratingCounts[5],
      },
      update: {
        totalCount,
        averageRating,
        rating1Count: ratingCounts[1],
        rating2Count: ratingCounts[2],
        rating3Count: ratingCounts[3],
        rating4Count: ratingCounts[4],
        rating5Count: ratingCounts[5],
      },
    });
  }

  console.log(`✅ Stats des avis mises à jour pour ${productsWithReviews.length} produits`);

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
