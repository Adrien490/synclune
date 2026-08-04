/**
 * Shared test factories - eliminates duplication across test files
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALID_CUID = "cm1234567890abcdefghijklm";
export const VALID_CUID_2 = "cm9876543210zyxwvutsrqpon";
/**
 * Id cuid **v2** dont la première lettre n'est PAS `c`.
 *
 * Tous les ids du schéma sont `@default(cuid(2))` : la première lettre est tirée au
 * hasard dans `a-z`, donc ~25 cas sur 26 ne commencent pas par `c`. `VALID_CUID` et
 * `VALID_CUID_2` commencent l'un et l'autre par `c` (héritage cuid v1) — ils
 * laissaient donc passer un validateur `z.cuid()` (regex v1 `/^[cC][0-9a-z]{6,}$/`)
 * sur un chemin où la production échouait sur 96 % des ids réels.
 *
 * Utiliser CETTE fixture pour tout id qui traverse une frontière de validation.
 * @see app/paiement/__tests__/checkout-return-order-id-cuid2.regression.test.ts
 */
export const VALID_CUID2_NON_C = "km7q2p9x4v1w8t3r6y5z0nba";
export const VALID_USER_ID = "user_cm1234567890abcdef";
export const VALID_ORDER_ID = "order_cm1234567890abcde";
export const VALID_SKU_ID = "sku_cm1234567890abcdefg";
const VALID_PRODUCT_ID = "prod_cm1234567890abcde";

// ============================================================================
// FORM DATA
// ============================================================================

export function createMockFormData(entries: Record<string, string | null>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		if (value !== null) {
			formData.set(key, value);
		}
	}
	return formData;
}

// ============================================================================
// AUTH / SESSION
// ============================================================================

function createMockSession(overrides: Record<string, unknown> = {}) {
	return {
		user: {
			id: VALID_USER_ID,
			email: "user@example.com",
			name: "Test User",
			role: "USER",
			...overrides,
		},
	};
}

function createMockAdminSession(overrides: Record<string, unknown> = {}) {
	return {
		user: {
			id: "admin_cm1234567890abcde",
			email: "admin@synclune.fr",
			name: "Admin Test",
			role: "ADMIN",
			...overrides,
		},
	};
}

// ============================================================================
// ORDERS
// ============================================================================

export function createMockOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_ORDER_ID,
		orderNumber: "SYN-2026-0001",
		userId: VALID_USER_ID,
		customerEmail: "client@example.com",
		customerName: "Marie Dupont",
		shippingFirstName: "Marie",
		shippingLastName: "Dupont",
		shippingAddress1: "12 Rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "France",
		status: "PENDING",
		paymentStatus: "PENDING",
		total: 4999,
		subtotal: 4999,
		discountAmount: 0,
		shippingCost: 0,
		invoiceNumber: null,
		stripeCheckoutSessionId: null,
		trackingNumber: null,
		trackingUrl: null,
		items: [
			{
				id: "cm1234567890abcdef0",
				skuId: VALID_SKU_ID,
				quantity: 1,
				productTitle: "Bracelet Lune",
				skuColor: "Or",
				skuMaterial: "Argent 925",
				skuSize: "M",
				price: 4999,
				// EINV-CREDIT-004 : `refundItems` agrégé par mark-as-fully-refunded
				// pour calculer la quantité restant à rembourser sur chaque item.
				refundItems: [],
			},
		],
		// EINV-CREDIT-004 : `refunds` lu par mark-as-fully-refunded pour calculer
		// le montant restant à rembourser (order.total - sum(active refunds)).
		refunds: [],
		...overrides,
	};
}

// ============================================================================
// PRODUCTS
// ============================================================================

function createMockProduct(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_PRODUCT_ID,
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		description: "Un bracelet artisanal inspire par la lune",
		status: "PUBLIC",
		typeId: "type_123",
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// SKUS
// ============================================================================

function createMockSku(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_SKU_ID,
		sku: "BRC-LUNE-OR-M",
		productId: VALID_PRODUCT_ID,
		priceInclTax: 4999,
		compareAtPrice: null,
		inventory: 10,
		isActive: true,
		isDefault: true,
		colorId: "color_123",
		materialId: "material_123",
		size: "M",
		...overrides,
	};
}

// ============================================================================
// USERS
// ============================================================================

function createMockUser(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_USER_ID,
		name: "Marie Dupont",
		email: "marie@example.com",
		role: "USER",
		accountStatus: "ACTIVE",
		emailVerified: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// CARTS
// ============================================================================

function createMockCart(overrides: Record<string, unknown> = {}) {
	return {
		id: "cart_cm1234567890abcde",
		userId: VALID_USER_ID,
		sessionId: null,
		items: [],
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

function createMockCartItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "ci_cm1234567890abcdef",
		cartId: "cart_cm1234567890abcde",
		skuId: VALID_SKU_ID,
		quantity: 1,
		priceAtAdd: 4999,
		addedAt: new Date("2026-01-15"),
		...overrides,
	};
}

// ============================================================================
// DISCOUNTS
// ============================================================================

function createMockDiscount(overrides: Record<string, unknown> = {}) {
	return {
		id: "disc_cm1234567890abcde",
		code: "PROMO20",
		type: "PERCENTAGE",
		value: 20,
		isActive: true,
		endsAt: new Date("2026-12-31"),
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 0,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// REFUNDS
// ============================================================================

function createMockRefund(overrides: Record<string, unknown> = {}) {
	return {
		id: "ref_cm1234567890abcde",
		orderId: VALID_ORDER_ID,
		stripeRefundId: null,
		amount: 4999,
		currency: "EUR",
		reason: "OTHER",
		status: "PENDING",
		note: null,
		failureReason: null,
		processedAt: null,
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		...overrides,
	};
}

// ============================================================================
// WEBHOOK EVENTS
// ============================================================================

function createMockWebhookEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: "we_cm1234567890abcde",
		stripeEventId: "evt_test_abc123",
		eventType: "checkout.session.completed",
		status: "PENDING",
		attempts: 0,
		receivedAt: new Date("2026-01-15"),
		processedAt: null,
		...overrides,
	};
}

// ============================================================================
// COLLECTIONS
// ============================================================================

function createMockCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: "col_cm1234567890abcde",
		title: "Ete 2026",
		slug: "ete-2026",
		description: "Collection estivale",
		isActive: true,
		position: 0,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// DISCOUNT USAGE
// ============================================================================

function createMockDiscountUsage(overrides: Record<string, unknown> = {}) {
	return {
		id: "du_cm1234567890abcde",
		discountId: "disc_cm1234567890abcde",
		userId: VALID_USER_ID,
		orderId: VALID_ORDER_ID,
		discountCode: "PROMO20",
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		...overrides,
	};
}

// ============================================================================
// ORDER ITEMS (standalone)
// ============================================================================

function createMockOrderItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "oi_cm1234567890abcde",
		orderId: VALID_ORDER_ID,
		productId: VALID_PRODUCT_ID,
		skuId: VALID_SKU_ID,
		productTitle: "Bracelet Lune",
		productDescription: null,
		productImageUrl: "https://cdn.example.com/bracelet.jpg",
		skuSku: "BRC-LUNE-OR-M",
		skuColor: "Or",
		skuMaterial: "Argent 925",
		skuSize: "M",
		price: 4999,
		quantity: 1,
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		...overrides,
	};
}

// ============================================================================
// REFUND ITEMS (standalone)
// ============================================================================

function createMockRefundItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "ri_cm1234567890abcde",
		refundId: "ref_cm1234567890abcde",
		orderItemId: "oi_cm1234567890abcde",
		quantity: 1,
		amount: 4999,
		createdAt: new Date("2026-01-20"),
		...overrides,
	};
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

function createMockProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt_cm1234567890abcde",
		slug: "bague",
		label: "Bague",
		description: null,
		isActive: true,
		isSystem: false,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

// ============================================================================
// COLORS
// ============================================================================

function createMockColor(overrides: Record<string, unknown> = {}) {
	return {
		id: "color_cm1234567890abcd",
		slug: "or-rose",
		name: "Or Rose",
		hex: "#B76E79",
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

// ============================================================================
// MATERIALS
// ============================================================================

function createMockMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: "mat_cm1234567890abcde",
		slug: "argent-925",
		name: "Argent 925",
		description: null,
		isActive: true,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Creates a mock Prisma transaction that passes the mockPrisma object as tx
 */
function createMockTransaction(mockPrisma: Record<string, unknown>) {
	return async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma);
}
