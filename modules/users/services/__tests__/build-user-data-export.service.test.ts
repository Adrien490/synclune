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
		termsVersion: "2026-07-06",
		marketingOptOutAt: null,
		addresses: [],
		orders: [],
		wishlist: null,
		discountUsages: [],
		sessions: [],
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
		refunds: [],
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
			termsVersion: "2026-07-06",
			marketingOptOutAt: null,
		});
	});

	it("should expose marketingOptOutAt as ISO string when the user opted out (RGPD-AUDIT P1-1)", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ marketingOptOutAt: LATER_DATE }));

		const result = await buildUserDataExport("user_1");

		expect(result!.profile.marketingOptOutAt).toBe(LATER_DATE.toISOString());
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
	// Refunds mapping (Art. 15/20 — portabilité)
	// -------------------------------------------------------------------------

	it("should map order refunds with amounts in euros and ISO dates", async () => {
		const order = buildOrder({
			refunds: [
				{
					amount: 1500,
					currency: "eur",
					reason: "DEFECTIVE",
					status: "COMPLETED",
					createdAt: BASE_DATE,
					processedAt: LATER_DATE,
				},
				{
					amount: 500,
					currency: "eur",
					reason: "OTHER",
					status: "PENDING",
					createdAt: BASE_DATE,
					processedAt: null,
				},
			],
		});
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ orders: [order] }));

		const result = await buildUserDataExport("user_1");

		expect(result!.orders[0]!.refunds).toEqual([
			{
				amount: 15,
				currency: "EUR",
				reason: "DEFECTIVE",
				status: "COMPLETED",
				requestedAt: BASE_DATE.toISOString(),
				processedAt: LATER_DATE.toISOString(),
			},
			{
				amount: 5,
				currency: "EUR",
				reason: "OTHER",
				status: "PENDING",
				requestedAt: BASE_DATE.toISOString(),
				processedAt: null,
			},
		]);
	});

	it("should return an empty refunds array when the order has no refund", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(buildUser({ orders: [buildOrder()] }));

		const result = await buildUserDataExport("user_1");

		expect(result!.orders[0]!.refunds).toEqual([]);
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
