import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockTx, mockRequireAuth, mockEnforceRateLimit, mockUpdateTag, mockValidateInput, mockHandleActionError, mockSuccess, mockError } =
	vi.hoisted(() => {
		const mockTx = {
			address: {
				findFirst: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		};

		return {
			mockPrisma: {
				address: {
					findFirst: vi.fn(),
				},
				$transaction: vi.fn(),
			},
			mockTx,
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

import { deleteAddress } from "../delete-address";

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

describe("deleteAddress", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default: authenticated user
		mockRequireAuth.mockResolvedValue({ user: { id: "user-123" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: { addressId: "addr-abc123" } });

		// Default: address exists, non-default
		mockPrisma.address.findFirst.mockResolvedValue({
			id: "addr-abc123",
			isDefault: false,
		});

		// Default: transaction executes the callback
		mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
			if (typeof fn === "function") return fn(mockTx);
			return Promise.all(fn as Promise<unknown>[]);
		});

		// Default: no other address found when deleting a default
		mockTx.address.findFirst.mockResolvedValue(null);
		mockTx.address.update.mockResolvedValue({});
		mockTx.address.delete.mockResolvedValue({});

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

		const result = await deleteAddress(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await deleteAddress(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid addressId", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await deleteAddress(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return not found error when address does not exist", async () => {
		mockPrisma.address.findFirst.mockResolvedValue(null);

		await deleteAddress(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Adresse non trouvee");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should return not found when address belongs to another user", async () => {
		// findFirst returns null because WHERE includes userId: user.id
		mockPrisma.address.findFirst.mockResolvedValue(null);

		await deleteAddress(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Adresse non trouvee");
	});

	it("should delete a non-default address without reassigning defaults", async () => {
		mockPrisma.address.findFirst.mockResolvedValue({
			id: "addr-abc123",
			isDefault: false,
		});

		await deleteAddress(undefined, validFormData);

		// Should not look for another address to promote
		expect(mockTx.address.findFirst).not.toHaveBeenCalled();
		expect(mockTx.address.update).not.toHaveBeenCalled();

		// Should delete the address
		expect(mockTx.address.delete).toHaveBeenCalledWith({
			where: { id: "addr-abc123" },
		});
	});

	it("should transfer default status when deleting the default address and another exists", async () => {
		mockPrisma.address.findFirst.mockResolvedValue({
			id: "addr-abc123",
			isDefault: true,
		});

		// Another address is available
		mockTx.address.findFirst.mockResolvedValue({ id: "addr-other", isDefault: false });

		await deleteAddress(undefined, validFormData);

		// Should promote the other address to default
		expect(mockTx.address.update).toHaveBeenCalledWith({
			where: { id: "addr-other" },
			data: { isDefault: true },
		});

		// Should still delete the original
		expect(mockTx.address.delete).toHaveBeenCalledWith({
			where: { id: "addr-abc123" },
		});
	});

	it("should delete the default address without promotion when no other address exists", async () => {
		mockPrisma.address.findFirst.mockResolvedValue({
			id: "addr-abc123",
			isDefault: true,
		});

		// No other address available
		mockTx.address.findFirst.mockResolvedValue(null);

		await deleteAddress(undefined, validFormData);

		// Should not attempt to update any address
		expect(mockTx.address.update).not.toHaveBeenCalled();

		// Should still delete the address
		expect(mockTx.address.delete).toHaveBeenCalledWith({
			where: { id: "addr-abc123" },
		});
	});

	it("should search for the other address scoped to the current user", async () => {
		mockPrisma.address.findFirst.mockResolvedValue({
			id: "addr-abc123",
			isDefault: true,
		});
		mockTx.address.findFirst.mockResolvedValue(null);

		await deleteAddress(undefined, validFormData);

		expect(mockTx.address.findFirst).toHaveBeenCalledWith({
			where: { userId: "user-123", id: { not: "addr-abc123" } },
			orderBy: { createdAt: "desc" },
		});
	});

	it("should return success message after successful deletion", async () => {
		const result = await deleteAddress(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith("Adresse supprimee avec succes");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should invalidate cache after successful deletion", async () => {
		await deleteAddress(undefined, validFormData);

		expect(mockUpdateTag).toHaveBeenCalledWith("addresses-user-user-123");
	});

	it("should verify address ownership when finding existing address", async () => {
		await deleteAddress(undefined, validFormData);

		expect(mockPrisma.address.findFirst).toHaveBeenCalledWith({
			where: { id: "addr-abc123", userId: "user-123" },
			select: { id: true, isDefault: true },
		});
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.address.findFirst.mockRejectedValue(new Error("DB error"));

		const result = await deleteAddress(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
