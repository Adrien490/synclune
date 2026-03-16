import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
	},
}));

import { buildUserDataExport } from "../build-user-data-export.service";
import { prisma } from "@/shared/lib/prisma";

const mockPrisma = prisma as unknown as { user: { findUnique: ReturnType<typeof vi.fn> } };

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_DATE = new Date("2024-06-15T10:00:00.000Z");
const LATER_DATE = new Date("2024-07-01T12:00:00.000Z");

function buildUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user_1",
		name: "Alice Dupont",
		email: "alice@example.com",
		createdAt: BASE_DATE,
		termsAcceptedAt: LATER_DATE,
		addresses: [],
		orders: [],
		wishlist: null,
		discountUsages: [],
		newsletterSubscription: null,
		reviews: [],
		sessions: [],
		customizationRequests: [],
		...overrides,
	};
}

function buildOrder(overrides: Record<string, unknown> = {}) {
	return {
		orderNumber: "CMD-001",
		createdAt: BASE_DATE,
		status: "DELIVERED",
		paymentStatus: "PAID",
		total: 4999,
		currency: "eur",
		shippingFirstName: "Alice",
		shippingLastName: "Dupont",
		shippingAddress1: "12 rue de la Paix",
		shippingCity: "Paris",
		shippingPostalCode: "75001",
		shippingCountry: "FR",
		items: [],
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildUserDataExport", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// -------------------------------------------------------------------------
	// Null user
	// -------------------------------------------------------------------------

	it("should return null when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await buildUserDataExport("unknown_user");

		expect(result).toBeNull();
	});

	// -------------------------------------------------------------------------
	// exportedAt
	// -------------------------------------------------------------------------

	it("should return an exportedAt ISO string close to now", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(buildUser());

		const before = new Date();
		const result = await buildUserDataExport("user_1");
		const after = new Date();

		expect(result).not.toBeNull();
		const exportedAt = new Date(result!.exportedAt);
		expect(exportedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(exportedAt.getTime()).toBeLessThanOrEqual(after.getTime());
	});

	// -------------------------------------------------------------------------
	// Profile mapping
	// -------------------------------------------------------------------------

	it("should map profile fields correctly", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(buildUser());

		const result = await buildUserDataExport("user_1");

		expect(result!.profile).toEqual({
			name: "Alice Dupont",
			email: "alice@example.com",
			createdAt: BASE_DATE.toISOString(),
			termsAcceptedAt: LATER_DATE.toISOString(),
		});
	});

	it("should set termsAcceptedAt to null when not set", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ termsAcceptedAt: null }));

		const result = await buildUserDataExport("user_1");

		expect(result!.profile.termsAcceptedAt).toBeNull();
	});

	// -------------------------------------------------------------------------
	// Cent-to-euro conversion
	// -------------------------------------------------------------------------

	it("should convert order total from cents to euros", async () => {
		const order = buildOrder({ total: 4999 });
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ orders: [order] }));

		const result = await buildUserDataExport("user_1");

		expect(result!.orders[0]!.total).toBe(49.99);
	});

	it("should convert order item price from cents to euros", async () => {
		const order = buildOrder({
			items: [
				{
					productTitle: "Bague argent",
					skuColor: "argent",
					skuMaterial: "argent 925",
					skuSize: "52",
					price: 2999,
					quantity: 1,
				},
			],
		});
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ orders: [order] }));

		const result = await buildUserDataExport("user_1");

		expect(result!.orders[0]!.items[0]!.price).toBe(29.99);
	});

	it("should convert discount amountApplied from cents to euros", async () => {
		const discountUsage = {
			discount: { code: "SUMMER10" },
			amountApplied: 1000,
			createdAt: BASE_DATE,
		};
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ discountUsages: [discountUsage] }));

		const result = await buildUserDataExport("user_1");

		expect(result!.discountUsages[0]!.amountApplied).toBe(10);
	});

	// -------------------------------------------------------------------------
	// Orders mapping
	// -------------------------------------------------------------------------

	it("should map order fields including currency uppercased and shipping address", async () => {
		const order = buildOrder({
			total: 9900,
			currency: "eur",
			items: [
				{
					productTitle: "Collier perles",
					skuColor: null,
					skuMaterial: "perles",
					skuSize: null,
					price: 9900,
					quantity: 1,
				},
			],
		});
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ orders: [order] }));

		const result = await buildUserDataExport("user_1");

		const mapped = result!.orders[0]!;
		expect(mapped.currency).toBe("EUR");
		expect(mapped.orderNumber).toBe("CMD-001");
		expect(mapped.status).toBe("DELIVERED");
		expect(mapped.paymentStatus).toBe("PAID");
		expect(mapped.date).toBe(BASE_DATE.toISOString());
		expect(mapped.shippingAddress).toEqual({
			firstName: "Alice",
			lastName: "Dupont",
			address1: "12 rue de la Paix",
			city: "Paris",
			postalCode: "75001",
			country: "FR",
		});
	});

	// -------------------------------------------------------------------------
	// Wishlist null safety
	// -------------------------------------------------------------------------

	it("should return an empty wishlist array when wishlist is null", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ wishlist: null }));

		const result = await buildUserDataExport("user_1");

		expect(result!.wishlist).toEqual([]);
	});

	it("should map wishlist items when wishlist exists", async () => {
		const wishlist = {
			items: [
				{ product: { title: "Bracelet doré" }, createdAt: BASE_DATE },
				{ product: { title: "Boucles d'oreilles" }, createdAt: LATER_DATE },
			],
		};
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ wishlist }));

		const result = await buildUserDataExport("user_1");

		expect(result!.wishlist).toEqual([
			{ productTitle: "Bracelet doré", addedAt: BASE_DATE.toISOString() },
			{ productTitle: "Boucles d'oreilles", addedAt: LATER_DATE.toISOString() },
		]);
	});

	it("should filter out wishlist items with a null product", async () => {
		const wishlist = {
			items: [
				{ product: { title: "Bague solitaire" }, createdAt: BASE_DATE },
				{ product: null, createdAt: LATER_DATE },
			],
		};
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ wishlist }));

		const result = await buildUserDataExport("user_1");

		expect(result!.wishlist).toHaveLength(1);
		expect(result!.wishlist[0]!.productTitle).toBe("Bague solitaire");
	});

	// -------------------------------------------------------------------------
	// Newsletter null dates handling
	// -------------------------------------------------------------------------

	it("should return null for newsletter when no subscription exists", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ newsletterSubscription: null }));

		const result = await buildUserDataExport("user_1");

		expect(result!.newsletter).toBeNull();
	});

	it("should map newsletter with null optional dates", async () => {
		const newsletterSubscription = {
			email: "alice@example.com",
			status: "SUBSCRIBED",
			subscribedAt: BASE_DATE,
			confirmedAt: null,
			unsubscribedAt: null,
			consentSource: "checkout",
			consentTimestamp: BASE_DATE,
			ipAddress: null,
		};
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ newsletterSubscription }));

		const result = await buildUserDataExport("user_1");

		expect(result!.newsletter).toEqual({
			email: "alice@example.com",
			status: "SUBSCRIBED",
			subscribedAt: BASE_DATE.toISOString(),
			confirmedAt: null,
			unsubscribedAt: null,
			consentSource: "checkout",
			consentTimestamp: BASE_DATE.toISOString(),
			ipAddress: null,
		});
	});

	it("should convert newsletter date fields to ISO strings when present", async () => {
		const newsletterSubscription = {
			email: "alice@example.com",
			status: "SUBSCRIBED",
			subscribedAt: BASE_DATE,
			confirmedAt: LATER_DATE,
			unsubscribedAt: LATER_DATE,
			consentSource: "footer",
			consentTimestamp: BASE_DATE,
			ipAddress: "127.0.0.1",
		};
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ newsletterSubscription }));

		const result = await buildUserDataExport("user_1");

		expect(result!.newsletter!.confirmedAt).toBe(LATER_DATE.toISOString());
		expect(result!.newsletter!.unsubscribedAt).toBe(LATER_DATE.toISOString());
	});

	// -------------------------------------------------------------------------
	// Reviews mapping
	// -------------------------------------------------------------------------

	it("should map reviews with null product title when product is missing", async () => {
		const reviews = [
			{
				product: null,
				rating: 4,
				title: "Beau produit",
				content: "Tres content de mon achat.",
				createdAt: BASE_DATE,
				updatedAt: LATER_DATE,
			},
		];
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ reviews }));

		const result = await buildUserDataExport("user_1");

		expect(result!.reviews[0]).toEqual({
			productTitle: null,
			rating: 4,
			title: "Beau produit",
			content: "Tres content de mon achat.",
			createdAt: BASE_DATE.toISOString(),
			updatedAt: LATER_DATE.toISOString(),
		});
	});

	// -------------------------------------------------------------------------
	// Sessions mapping
	// -------------------------------------------------------------------------

	it("should map sessions with ISO date strings", async () => {
		const sessions = [
			{
				ipAddress: "192.168.1.1",
				userAgent: "Mozilla/5.0",
				createdAt: BASE_DATE,
				expiresAt: LATER_DATE,
			},
		];
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ sessions }));

		const result = await buildUserDataExport("user_1");

		expect(result!.sessions[0]).toEqual({
			ipAddress: "192.168.1.1",
			userAgent: "Mozilla/5.0",
			createdAt: BASE_DATE.toISOString(),
			expiresAt: LATER_DATE.toISOString(),
		});
	});

	// -------------------------------------------------------------------------
	// Customization requests mapping
	// -------------------------------------------------------------------------

	it("should map customization requests correctly", async () => {
		const customizationRequests = [
			{
				firstName: "Alice",
				email: "alice@example.com",
				phone: "+33612345678",
				productTypeLabel: "Bague",
				details: "Gravure initiales A.D.",
				status: "PENDING",
				createdAt: BASE_DATE,
			},
		];
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ customizationRequests }));

		const result = await buildUserDataExport("user_1");

		expect(result!.customizationRequests[0]).toEqual({
			firstName: "Alice",
			email: "alice@example.com",
			phone: "+33612345678",
			productTypeLabel: "Bague",
			details: "Gravure initiales A.D.",
			status: "PENDING",
			createdAt: BASE_DATE.toISOString(),
		});
	});

	// -------------------------------------------------------------------------
	// Addresses mapping
	// -------------------------------------------------------------------------

	it("should map addresses with all fields", async () => {
		const addresses = [
			{
				firstName: "Alice",
				lastName: "Dupont",
				address1: "12 rue de la Paix",
				address2: "Apt 3B",
				postalCode: "75001",
				city: "Paris",
				country: "FR",
				phone: "+33612345678",
				isDefault: true,
			},
		];
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ addresses }));

		const result = await buildUserDataExport("user_1");

		expect(result!.addresses[0]).toEqual({
			firstName: "Alice",
			lastName: "Dupont",
			address1: "12 rue de la Paix",
			address2: "Apt 3B",
			postalCode: "75001",
			city: "Paris",
			country: "FR",
			phone: "+33612345678",
			isDefault: true,
		});
	});
});
