import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockRequireAuth, mockEnforceRateLimit, mockUpdateTag, mockValidateInput, mockHandleActionError, mockSuccess, mockError } =
	vi.hoisted(() => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non authentifie" };
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Donnees invalides" };

		return {
			mockPrisma: {
				address: {
					count: vi.fn(),
					create: vi.fn(),
				},
			},
			mockRequireAuth: vi.fn(),
			mockEnforceRateLimit: vi.fn(),
			mockUpdateTag: vi.fn(),
			mockValidateInput: vi.fn(),
			mockHandleActionError: vi.fn(),
			mockSuccess: vi.fn(),
			mockError: vi.fn(),
			// Keep error objects accessible for setup
			_authError: authError,
			_rateLimitError: rateLimitError,
			_validationError: validationError,
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

// Mock addressSchema - validation is handled by mocked validateInput
vi.mock("@/shared/schemas/address-schema", () => ({
	addressSchema: {},
}));

// Mock rate-limit-config to avoid real Arcjet/Upstash init
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADDRESS_LIMITS: { MUTATE: "address-mutate" },
}));

import { createAddress } from "../create-address";

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

// ============================================================================
// TESTS
// ============================================================================

describe("createAddress", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default: authenticated user
		mockRequireAuth.mockResolvedValue({ user: { id: "user-123" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: validatedAddressData });

		// Default: user has 2 addresses (not first, not at limit)
		mockPrisma.address.count.mockResolvedValue(2);
		mockPrisma.address.create.mockResolvedValue({ id: "addr-new" });

		// Default: success/error helpers return shaped ActionState
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

		const result = await createAddress(undefined, validFormData);

		expect(result).toEqual(authError);
		expect(mockPrisma.address.create).not.toHaveBeenCalled();
	});

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await createAddress(undefined, validFormData);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.address.create).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid data", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "Donnees invalides" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await createAddress(undefined, validFormData);

		expect(result).toEqual(validationError);
		expect(mockPrisma.address.create).not.toHaveBeenCalled();
	});

	it("should create the first address as default (isDefault = true)", async () => {
		// First address: count = 0
		mockPrisma.address.count.mockResolvedValue(0);

		await createAddress(undefined, validFormData);

		expect(mockPrisma.address.create).toHaveBeenCalledWith({
			data: {
				...validatedAddressData,
				userId: "user-123",
				isDefault: true,
			},
		});
	});

	it("should return the default address success message for the first address", async () => {
		mockPrisma.address.count.mockResolvedValue(0);

		const result = await createAddress(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith("Adresse ajoutee et definie comme adresse par defaut");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should create a subsequent address as non-default (isDefault = false)", async () => {
		// Already has 2 addresses
		mockPrisma.address.count.mockResolvedValue(2);

		await createAddress(undefined, validFormData);

		expect(mockPrisma.address.create).toHaveBeenCalledWith({
			data: {
				...validatedAddressData,
				userId: "user-123",
				isDefault: false,
			},
		});
	});

	it("should return the standard success message for subsequent addresses", async () => {
		mockPrisma.address.count.mockResolvedValue(2);

		const result = await createAddress(undefined, validFormData);

		expect(mockSuccess).toHaveBeenCalledWith("Adresse ajoutee avec succes");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should reject when user has reached MAX_ADDRESSES_PER_USER (10)", async () => {
		mockPrisma.address.count.mockResolvedValue(10);

		await createAddress(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith("Vous ne pouvez pas avoir plus de 10 adresses");
		expect(mockPrisma.address.create).not.toHaveBeenCalled();
	});

	it("should reject when user has more than 10 addresses", async () => {
		mockPrisma.address.count.mockResolvedValue(11);

		await createAddress(undefined, validFormData);

		expect(mockError).toHaveBeenCalledWith(expect.stringContaining("10 adresses"));
		expect(mockPrisma.address.create).not.toHaveBeenCalled();
	});

	it("should invalidate cache after successful creation", async () => {
		mockPrisma.address.count.mockResolvedValue(1);

		await createAddress(undefined, validFormData);

		// Cache invalidation uses updateTag with user-scoped tag
		expect(mockUpdateTag).toHaveBeenCalledWith(`addresses-user-user-123`);
	});

	it("should check address count scoped to current user", async () => {
		mockPrisma.address.count.mockResolvedValue(0);

		await createAddress(undefined, validFormData);

		expect(mockPrisma.address.count).toHaveBeenCalledWith({
			where: { userId: "user-123" },
		});
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.address.count.mockResolvedValue(0);
		mockPrisma.address.create.mockRejectedValue(new Error("DB connection failed"));

		const result = await createAddress(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
