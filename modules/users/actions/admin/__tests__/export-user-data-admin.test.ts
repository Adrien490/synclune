import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockNotFound,
	mockHandleActionError,
} = vi.hoisted(() => ({
	mockPrisma: {
		user: { findUnique: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_USER_LIMITS: { EXPORT_DATA: "user-export-data" },
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	notFound: mockNotFound,
	handleActionError: mockHandleActionError,
}));

vi.mock("../../../schemas/user-admin.schemas", () => ({
	adminUserIdSchema: {},
}));

import { exportUserDataAdmin } from "../export-user-data-admin";

// ============================================================================
// HELPERS
// ============================================================================

function makeFullUser(overrides: Record<string, unknown> = {}) {
	const now = new Date();
	return {
		id: "user-456",
		name: "Marie Dupont",
		email: "marie@example.com",
		createdAt: now,
		addresses: [
			{
				firstName: "Marie",
				lastName: "Dupont",
				address1: "1 rue de la Paix",
				address2: null,
				postalCode: "75001",
				city: "Paris",
				country: "FR",
				phone: "+33612345678",
				isDefault: true,
			},
		],
		orders: [
			{
				orderNumber: "SYN-001",
				createdAt: now,
				status: "DELIVERED",
				paymentStatus: "PAID",
				total: 4500,
				currency: "eur",
				items: [
					{
						productTitle: "Bracelet Lune",
						skuColor: "Or",
						skuMaterial: "Or 18k",
						skuSize: null,
						price: 4500,
						quantity: 1,
					},
				],
				shippingFirstName: "Marie",
				shippingLastName: "Dupont",
				shippingAddress1: "1 rue de la Paix",
				shippingCity: "Paris",
				shippingPostalCode: "75001",
				shippingCountry: "FR",
			},
		],
		wishlist: {
			items: [{ product: { title: "Collier Etoile" }, createdAt: now }],
		},
		discountUsages: [
			{
				discount: { code: "BIENVENUE10" },
				amountApplied: 450,
				createdAt: now,
			},
		],
		newsletterSubscription: {
			email: "marie@example.com",
			status: "ACTIVE",
			subscribedAt: now,
			confirmedAt: now,
			unsubscribedAt: null,
			consentSource: "CHECKOUT",
			consentTimestamp: now,
			ipAddress: "127.0.0.1",
		},
		reviews: [
			{
				product: { title: "Bracelet Lune" },
				rating: 5,
				title: "Magnifique",
				content: "Très beau bracelet",
				createdAt: now,
				updatedAt: now,
			},
		],
		sessions: [
			{
				ipAddress: "192.168.1.1",
				userAgent: "Mozilla/5.0",
				createdAt: now,
				expiresAt: new Date(now.getTime() + 86400000),
			},
		],
		customizationRequests: [
			{
				firstName: "Marie",
				email: "marie@example.com",
				phone: "+33612345678",
				productTypeLabel: "Bracelet",
				details: "Gravure personnalisée",
				status: "PENDING",
				createdAt: now,
			},
		],
		...overrides,
	};
}

// ============================================================================
// exportUserDataAdmin
// ============================================================================

describe("exportUserDataAdmin", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-123" } });
		mockValidateInput.mockReturnValue({ data: { userId: "user-456" } });
		mockPrisma.user.findUnique.mockResolvedValue(makeFullUser());

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await exportUserDataAdmin("user-456");

		expect(result).toEqual(rateLimitError);
		expect(mockRequireAdmin).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await exportUserDataAdmin("user-456");

		expect(result).toEqual(authError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid userId", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await exportUserDataAdmin("invalid");

		expect(result).toEqual(validationError);
		expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// User checks
	// ──────────────────────────────────────────────────────────────

	it("should return not found when user does not exist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);

		const result = await exportUserDataAdmin("user-456");

		expect(mockNotFound).toHaveBeenCalledWith("Utilisateur");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	// ──────────────────────────────────────────────────────────────
	// Success — export data
	// ──────────────────────────────────────────────────────────────

	it("should return success with exported data", async () => {
		const result = await exportUserDataAdmin("user-456");

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			"Données exportées avec succès",
			expect.objectContaining({
				exportedAt: expect.any(String),
				profile: expect.objectContaining({
					name: "Marie Dupont",
					email: "marie@example.com",
				}),
			})
		);
	});

	it("should include addresses in export", async () => {
		await exportUserDataAdmin("user-456");

		const exportData = mockSuccess.mock.calls[0][1];
		expect(exportData.addresses).toHaveLength(1);
		expect(exportData.addresses[0]).toEqual(
			expect.objectContaining({
				firstName: "Marie",
				lastName: "Dupont",
				city: "Paris",
			})
		);
	});

	it("should convert order totals from cents to euros", async () => {
		await exportUserDataAdmin("user-456");

		const exportData = mockSuccess.mock.calls[0][1];
		expect(exportData.orders[0].total).toBe(45);
		expect(exportData.orders[0].items[0].price).toBe(45);
	});

	it("should convert discount amounts from cents to euros", async () => {
		await exportUserDataAdmin("user-456");

		const exportData = mockSuccess.mock.calls[0][1];
		expect(exportData.discountUsages[0].amountApplied).toBe(4.5);
	});

	it("should handle user with no wishlist", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeFullUser({ wishlist: null })
		);

		await exportUserDataAdmin("user-456");

		const exportData = mockSuccess.mock.calls[0][1];
		expect(exportData.wishlist).toEqual([]);
	});

	it("should handle user with no newsletter subscription", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeFullUser({ newsletterSubscription: null })
		);

		await exportUserDataAdmin("user-456");

		const exportData = mockSuccess.mock.calls[0][1];
		expect(exportData.newsletter).toBeNull();
	});

	it("should handle user with empty relations", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeFullUser({
				addresses: [],
				orders: [],
				wishlist: { items: [] },
				discountUsages: [],
				reviews: [],
				sessions: [],
				customizationRequests: [],
				newsletterSubscription: null,
			})
		);

		const result = await exportUserDataAdmin("user-456");

		expect(result.status).toBe(ActionStatus.SUCCESS);
		const exportData = mockSuccess.mock.calls[0][1];
		expect(exportData.addresses).toHaveLength(0);
		expect(exportData.orders).toHaveLength(0);
		expect(exportData.wishlist).toHaveLength(0);
	});

	it("should filter out wishlist items with null product", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(
			makeFullUser({
				wishlist: {
					items: [
						{ product: { title: "Valid" }, createdAt: new Date() },
						{ product: null, createdAt: new Date() },
					],
				},
			})
		);

		await exportUserDataAdmin("user-456");

		const exportData = mockSuccess.mock.calls[0][1];
		expect(exportData.wishlist).toHaveLength(1);
		expect(exportData.wishlist[0].productTitle).toBe("Valid");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"));

		const result = await exportUserDataAdmin("user-456");

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Erreur lors de l'export des données"
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
