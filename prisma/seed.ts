import { fakerFR } from "@faker-js/faker";
import { PrismaNeon } from "@prisma/adapter-neon";
import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
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

// Générer une date aléatoire en novembre 2025
function randomNovember2025Date(): Date {
  const day = faker.number.int({ min: 1, max: 28 });
  const hour = faker.number.int({ min: 8, max: 22 });
  const minute = faker.number.int({ min: 0, max: 59 });
  return new Date(2025, 10, day, hour, minute); // Mois 10 = Novembre (0-indexed)
}

async function main(): Promise<void> {
  console.log("🌱 Démarrage du seed...");

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

  await prisma.user.createMany({ data: usersData });
  console.log(`✅ ${usersData.length} utilisateurs créés`);

  // ============================================
  // COMMANDES (utilise les produits existants)
  // ============================================

  // Récupérer les produits existants avec leurs SKUs
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
        skuMaterial: sku.material || null,
        skuSize: sku.size || null,
        skuImageUrl: sku.images?.[0]?.url || null,
        price: sku.priceInclTax,
        quantity,
      });
    }

    if (itemsData.length === 0) continue;

    const shipping = faker.helpers.arrayElement([0, 499, 699, 899]);
    const total = subtotal + shipping;

    // Distribution des statuts réaliste
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

    // Fulfillment status basé sur order status
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

    // Date de commande en novembre 2025
    const orderDate = randomNovember2025Date();

    // Tracking pour commandes expédiées/livrées
    let trackingData: Partial<Prisma.OrderCreateInput> = {};
    if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
      const shippingMethod = faker.helpers.arrayElement([
        "Colissimo",
        "Mondial Relay",
        "Chronopost",
        "Lettre suivie",
      ]);

      // Expédié quelques jours après la commande
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

    // Générer un numéro de facture pour les commandes payées
    const invoiceNumber = paymentStatus === PaymentStatus.PAID
      ? `FAC-2025-${(i + 1).toString().padStart(5, "0")}`
      : null;

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
        invoiceNumber,
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
