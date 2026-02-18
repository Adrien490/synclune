import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockRequireAuth, mockEnforceRateLimit, mockUpdateTag, mockValidateInput, mockHandleActionError, mockSuccess, mockError } =
	vi.hoisted(() => ({
		mockPrisma: {
			address: {
				findFirst: vi.fn(),
				update: vi.fn(),
				updateMany: vi.fn(),
			},
		},
		mockRequireAuth: vi.fn(),
		mockEnforceRateLimit: vi.fn(),
		mockUpdateTag: vi.fn(),
		mockValidateInput: vi.fn(),
		mockHandleActionError: vi.fn(),
		mockSuccess: vi.fn(),
		mockError: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));

vi.mock("@/shared/schemas/address-schema", () => ({
	addressSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADDRESS_LIMITS: { MUTATE: "address-mutate" },
}));

import { updateAddress } from "../update-address";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(data)) {
		formData.set(key, value);
	}
	return formData;
}

const validFormData = createFormData({
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 Rue de la Paix",
	postalCode: "75001",
	city: "Paris",
	phone: "+33612345678",
});

const validatedAddressData = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 Rue de la Paix",
	address2: null,
	postalCode: "75001",
	city: "Paris",
	country: "FR",
	phone: "+33612345678",
};

const ADDRESS_ID = "addr-abc123";

// ============================================================================
// TESTS
// ============================================================================

describe("updateAddress", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default: authenticated user
		mockRequireAuth.mockResolvedValue({ user: { id: "user-123" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: address exists and belongs to the user
		mockPrisma.address.findFirst.mockResolvedValue({ id: ADDRESS_ID });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: validatedAddressData });

		// Default: update succeeds
		mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });

		// Default: success/error helpers
		mockSuccess.mockImplementation((message: string) => ({
			status: ActionStatus.SUCCESS,
			message,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not authenticated", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non authentifie" };
		mockRequireAuth.mockResolvedValue({ error: authError });

		const result = await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
	});

	it("should return not found when address does not exist for the current user", async () => {
		// findFirst returns null: address does not exist or belongs to another user
		mockPrisma.address.findFirst.mockResolvedValue(null);

		await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Adresse non trouvee");
		expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
	});

	it("should return not found when address belongs to another user", async () => {
		// Simulate ownership check: findFirst scopes by userId so returns null
		mockPrisma.address.findFirst.mockResolvedValue(null);

		await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Adresse non trouvee");
	});

	it("should return validation error for invalid form data", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Prenom invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
	});

	it("should update address with validated data on success", async () => {
		await updateAddress(ADDRESS_ID, undefined, validFormData);

		// updateMany scopes by both id and userId for security
		expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
			where: { id: ADDRESS_ID, userId: "user-123" },
			data: validatedAddressData,
		});
	});

	it("should verify ownership before update using findFirst with userId", async () => {
		await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(mockPrisma.address.findFirst).toHaveBeenCalledWith({
			where: { id: ADDRESS_ID, userId: "user-123" },
			select: { id: true },
		});
	});

	it("should return success message after update", async () => {
		const result = await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith("Adresse modifiee avec succes");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache after successful update", async () => {
		await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("addresses-user-user-123");
	});

	it("should use the bound addressId in the update WHERE clause", async () => {
		const specificId = "addr-specific-456";
		mockPrisma.address.findFirst.mockResolvedValue({ id: specificId });

		await updateAddress(specificId, undefined, validFormData);

		expect(mockPrisma.address.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: specificId, userId: "user-123" },
			})
		);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.address.updateMany.mockRejectedValue(new Error("DB constraint violation"));

		const result = await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should not invalidate cache when update fails", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Donnees invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		await updateAddress(ADDRESS_ID, undefined, validFormData);

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});
});
