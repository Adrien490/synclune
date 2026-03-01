/**
 * Shared test factories - eliminates duplication across test files
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALID_CUID = "cm1234567890abcdefghijklm";
export const VALID_CUID_2 = "cm9876543210zyxwvutsrqpon";
export const VALID_USER_ID = "user_cm1234567890abcdef";
export const VALID_ORDER_ID = "order_cm1234567890abcde";
export const VALID_SKU_ID = "sku_cm1234567890abcdefg";
export const VALID_PRODUCT_ID = "prod_cm1234567890abcde";

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

export function createMockSession(overrides: Record<string, unknown> = {}) {
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

export function createMockAdminSession(overrides: Record<string, unknown> = {}) {
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
		fulfillmentStatus: "UNFULFILLED",
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
				skuId: VALID_SKU_ID,
				quantity: 1,
				productTitle: "Bracelet Lune",
				skuColor: "Or",
				skuMaterial: "Argent 925",
				skuSize: "M",
				price: 4999,
			},
		],
		...overrides,
	};
}

// ============================================================================
// PRODUCTS
// ============================================================================

export function createMockProduct(overrides: Record<string, unknown> = {}) {
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

export function createMockSku(overrides: Record<string, unknown> = {}) {
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

export function createMockUser(overrides: Record<string, unknown> = {}) {
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
// ADDRESSES
// ============================================================================

export function createMockAddress(overrides: Record<string, unknown> = {}) {
	return {
		id: "addr_cm1234567890abcde",
		userId: VALID_USER_ID,
		firstName: "Marie",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: null,
		postalCode: "75001",
		city: "Paris",
		country: "FR",
		phone: "+33612345678",
		isDefault: false,
		...overrides,
	};
}

// ============================================================================
// CARTS
// ============================================================================

export function createMockCart(overrides: Record<string, unknown> = {}) {
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

export function createMockCartItem(overrides: Record<string, unknown> = {}) {
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

export function createMockDiscount(overrides: Record<string, unknown> = {}) {
	return {
		id: "disc_cm1234567890abcde",
		code: "PROMO20",
		type: "PERCENTAGE",
		value: 20,
		isActive: true,
		startsAt: new Date("2026-01-01"),
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

export function createMockRefund(overrides: Record<string, unknown> = {}) {
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

export function createMockWebhookEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: "we_cm1234567890abcde",
		stripeEventId: "evt_test_abc123",
		eventType: "checkout.session.completed",
		status: "PENDING",
		errorMessage: null,
		attempts: 0,
		receivedAt: new Date("2026-01-15"),
		processedAt: null,
		...overrides,
	};
}

// ============================================================================
// REVIEWS
// ============================================================================

export function createMockReview(overrides: Record<string, unknown> = {}) {
	return {
		id: "rev_cm1234567890abcde",
		productId: VALID_PRODUCT_ID,
		userId: VALID_USER_ID,
		orderId: VALID_ORDER_ID,
		rating: 5,
		comment: "Magnifique bijou, je recommande !",
		isVerifiedPurchase: true,
		createdAt: new Date("2026-02-01"),
		updatedAt: new Date("2026-02-01"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// COLLECTIONS
// ============================================================================

export function createMockCollection(overrides: Record<string, unknown> = {}) {
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
// NEWSLETTER
// ============================================================================

export function createMockNewsletterSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		id: "ns_cm1234567890abcde",
		email: "subscriber@example.com",
		isConfirmed: true,
		confirmationToken: null,
		confirmedAt: new Date("2026-01-05"),
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// CUSTOMIZATION REQUESTS
// ============================================================================

export function createMockCustomizationRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "cr_cm1234567890abcde",
		userId: VALID_USER_ID,
		firstName: "Marie",
		email: "marie@example.com",
		phone: "+33612345678",
		productTypeLabel: "Bague",
		productTypeId: "type_123",
		details: "Bague personnalisee avec gravure initiales",
		inspirationImageUrls: [],
		status: "PENDING",
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// DISPUTES
// ============================================================================

export function createMockDispute(overrides: Record<string, unknown> = {}) {
	return {
		id: "dp_cm1234567890abcde",
		stripeDisputeId: "dp_test_abc123",
		orderId: VALID_ORDER_ID,
		amount: 4999,
		fee: 1500,
		currency: "EUR",
		reason: "FRAUDULENT",
		status: "NEEDS_RESPONSE",
		dueBy: new Date("2026-02-15"),
		resolvedAt: null,
		createdAt: new Date("2026-01-20"),
		updatedAt: new Date("2026-01-20"),
		...overrides,
	};
}

// ============================================================================
// DISCOUNT USAGE
// ============================================================================

export function createMockDiscountUsage(overrides: Record<string, unknown> = {}) {
	return {
		id: "du_cm1234567890abcde",
		discountId: "disc_cm1234567890abcde",
		userId: VALID_USER_ID,
		orderId: VALID_ORDER_ID,
		discountCode: "PROMO20",
		amountApplied: 998,
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		...overrides,
	};
}

// ============================================================================
// ORDER ITEMS (standalone)
// ============================================================================

export function createMockOrderItem(overrides: Record<string, unknown> = {}) {
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
		skuImageUrl: null,
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

export function createMockRefundItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "ri_cm1234567890abcde",
		refundId: "ref_cm1234567890abcde",
		orderItemId: "oi_cm1234567890abcde",
		quantity: 1,
		amount: 4999,
		restock: true,
		createdAt: new Date("2026-01-20"),
		...overrides,
	};
}

// ============================================================================
// WISHLIST
// ============================================================================

export function createMockWishlist(overrides: Record<string, unknown> = {}) {
	return {
		id: "wl_cm1234567890abcde",
		userId: VALID_USER_ID,
		sessionId: null,
		expiresAt: null,
		items: [],
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

export function createMockWishlistItem(overrides: Record<string, unknown> = {}) {
	return {
		id: "wi_cm1234567890abcde",
		wishlistId: "wl_cm1234567890abcde",
		productId: VALID_PRODUCT_ID,
		backInStockNotifiedAt: null,
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		...overrides,
	};
}

// ============================================================================
// ORDER NOTES
// ============================================================================

export function createMockOrderNote(overrides: Record<string, unknown> = {}) {
	return {
		id: "on_cm1234567890abcde",
		orderId: VALID_ORDER_ID,
		content: "Client contacte par telephone",
		authorId: "admin_cm1234567890abcde",
		authorName: "Admin Test",
		createdAt: new Date("2026-01-15"),
		updatedAt: new Date("2026-01-15"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export function createMockProductType(overrides: Record<string, unknown> = {}) {
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

export function createMockColor(overrides: Record<string, unknown> = {}) {
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

export function createMockMaterial(overrides: Record<string, unknown> = {}) {
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
// REVIEW RESPONSES
// ============================================================================

export function createMockReviewResponse(overrides: Record<string, unknown> = {}) {
	return {
		id: "rr_cm1234567890abcde",
		reviewId: "rev_cm1234567890abcde",
		content: "Merci pour votre avis ! Nous sommes ravis que ce bijou vous plaise.",
		authorId: "admin_cm1234567890abcde",
		authorName: "Admin Test",
		createdAt: new Date("2026-02-05"),
		updatedAt: new Date("2026-02-05"),
		deletedAt: null,
		...overrides,
	};
}

// ============================================================================
// PRODUCT REVIEW STATS
// ============================================================================

export function createMockProductReviewStats(overrides: Record<string, unknown> = {}) {
	return {
		id: "prs_cm1234567890abcd",
		productId: VALID_PRODUCT_ID,
		totalCount: 12,
		averageRating: 4.5,
		rating1Count: 0,
		rating2Count: 1,
		rating3Count: 1,
		rating4Count: 4,
		rating5Count: 6,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-02-01"),
		...overrides,
	};
}

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Creates a mock Prisma transaction that passes the mockPrisma object as tx
 */
export function createMockTransaction(mockPrisma: Record<string, unknown>) {
	return async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma);
}
