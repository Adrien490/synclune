/**
 * Shared test factories - eliminates duplication across test files
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const VALID_CUID = "cm1234567890abcdefghijklm"
export const VALID_CUID_2 = "cm9876543210zyxwvutsrqpon"
export const VALID_USER_ID = "user_cm1234567890abcdef"
export const VALID_ORDER_ID = "order_cm1234567890abcde"
export const VALID_SKU_ID = "sku_cm1234567890abcdefg"
export const VALID_PRODUCT_ID = "prod_cm1234567890abcde"

// ============================================================================
// FORM DATA
// ============================================================================

export function createMockFormData(entries: Record<string, string | null>): FormData {
	const formData = new FormData()
	for (const [key, value] of Object.entries(entries)) {
		if (value !== null) {
			formData.set(key, value)
		}
	}
	return formData
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
	}
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
	}
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
	}
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
	}
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
	}
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
	}
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
	}
}

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Creates a mock Prisma transaction that passes the mockPrisma object as tx
 */
export function createMockTransaction(mockPrisma: Record<string, unknown>) {
	return async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)
}
