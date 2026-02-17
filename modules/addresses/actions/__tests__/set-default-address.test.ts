import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockRequireAuth, mockEnforceRateLimit, mockUpdateTag, mockValidateInput, mockHandleActionError, mockSuccess, mockError } =
	vi.hoisted(() => {
		// updateMany and update return promise results used in array-style $transaction
		const mockUpdateMany = vi.fn();
		const mockUpdate = vi.fn();

		return {
			mockPrisma: {
				address: {
					findFirst: vi.fn(),
					updateMany: mockUpdateMany,
					update: mockUpdate,
				},
				$transaction: vi.fn(),
			},
			mockRequireAuth: vi.fn(),
			mockEnforceRateLimit: vi.fn(),
			mockUpdateTag: vi.fn(),
			mockValidateInput: vi.fn(),
			mockHandleActionError: vi.fn(),
			mockSuccess: vi.fn(),
			mockError: vi.fn(),
		};
	});

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

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADDRESS_LIMITS: { MUTATE: "address-mutate" },
}));

import { setDefaultAddress } from "../set-default-address";

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

const validFormData = createFormData({ addressId: "addr-abc123" });

// ============================================================================
// TESTS
// ============================================================================

describe("setDefaultAddress", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default: authenticated user
		mockRequireAuth.mockResolvedValue({ user: { id: "user-123" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: { addressId: "addr-abc123" } });

		// Default: address exists and belongs to the user
		mockPrisma.address.findFirst.mockResolvedValue({ id: "addr-abc123" });

		// Default: array-style transaction resolves both operations
		mockPrisma.address.updateMany.mockResolvedValue({ count: 3 });
		mockPrisma.address.update.mockResolvedValue({ id: "addr-abc123", isDefault: true });
		mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));

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

		const result = await setDefaultAddress(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await setDefaultAddress(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid addressId", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await setDefaultAddress(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return not found when address does not exist", async () => {
		mockPrisma.address.findFirst.mockResolvedValue(null);

		await setDefaultAddress(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Adresse non trouvee");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return not found when address belongs to another user", async () => {
		// findFirst scopes by userId, returns null for addresses owned by others
		mockPrisma.address.findFirst.mockResolvedValue(null);

		await setDefaultAddress(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Adresse non trouvee");
	});

	it("should verify address ownership with userId in the WHERE clause", async () => {
		await setDefaultAddress(undefined, validFormData);

		expect(mockPrisma.address.findFirst).toHaveBeenCalledWith({
			where: { id: "addr-abc123", userId: "user-123" },
			select: { id: true },
		});
	});

	it("should unset all user addresses before setting the new default", async () => {
		await setDefaultAddress(undefined, validFormData);

		expect(mockPrisma.address.updateMany).toHaveBeenCalledWith({
			where: { userId: "user-123" },
			data: { isDefault: false },
		});
	});

	it("should set the target address as default", async () => {
		await setDefaultAddress(undefined, validFormData);

		expect(mockPrisma.address.update).toHaveBeenCalledWith({
			where: { id: "addr-abc123" },
			data: { isDefault: true },
		});
	});

	it("should run updateMany and update inside the same transaction", async () => {
		await setDefaultAddress(undefined, validFormData);

		// $transaction was called once with an array of operations
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		const txArg = mockPrisma.$transaction.mock.calls[0][0];
		// The array-style transaction receives prisma calls (promises)
		expect(Array.isArray(txArg)).toBe(true);
		expect(txArg).toHaveLength(2);
	});

	it("should return success message after setting default", async () => {
		const result = await setDefaultAddress(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith("Adresse par defaut modifiee");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache after successfully setting default", async () => {
		await setDefaultAddress(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("addresses-user-user-123");
	});

	it("should not invalidate cache when address is not found", async () => {
		mockPrisma.address.findFirst.mockResolvedValue(null);

		await setDefaultAddress(undefined, validFormData);

		expect(mockUpdateTag).not.toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

		const result = await setDefaultAddress(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should use the addressId from validated data (not raw formData) in the transaction", async () => {
		// validateInput returns a different id to confirm we use validated data
		mockValidateInput.mockReturnValue({ data: { addressId: "addr-validated-789" } });
		mockPrisma.address.findFirst.mockResolvedValue({ id: "addr-validated-789" });

		await setDefaultAddress(undefined, validFormData);

		expect(mockPrisma.address.update).toHaveBeenCalledWith({
			where: { id: "addr-validated-789" },
			data: { isDefault: true },
		});
	});
});
