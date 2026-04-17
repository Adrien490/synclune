import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockCheckCartRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockPrisma,
	mockUpdateTag,
	mockGetCartInvalidationTags,
} = vi.hoisted(() => ({
	mockCheckCartRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockPrisma: {
		cart: { findFirst: vi.fn(), update: vi.fn() },
	},
	mockUpdateTag: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-rate-limit", () => ({
	checkCartRateLimit: mockCheckCartRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	CART_LIMITS: { METADATA: "metadata" },
}));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));
vi.mock("../../schemas/cart.schemas", () => ({
	setGuestContactInfoSchema: {},
}));

import { setGuestContactInfo } from "../set-guest-contact-info";

function makeFormData(email = "guest@example.com") {
	const fd = new FormData();
	fd.set("email", email);
	fd.set("marketingConsent", "true");
	return fd;
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: undefined, sessionId: "sess-1" },
	});
	mockValidateInput.mockReturnValue({
		data: { email: "guest@example.com", phone: undefined, marketingConsent: true },
	});
	mockPrisma.cart.findFirst.mockResolvedValue({ id: "cart-1" });
	mockPrisma.cart.update.mockResolvedValue({});
	mockGetCartInvalidationTags.mockReturnValue(["cart-tag"]);
	mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
		status: "success",
		message: msg,
		data,
	}));
	mockError.mockImplementation((msg: string) => ({ status: "error", message: msg }));
	mockHandleActionError.mockReturnValue({ status: "error", message: "fallback" });
}

describe("setGuestContactInfo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns success noop when user connected (uses user account email)", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: "user-1", sessionId: null },
		});
		const result = await setGuestContactInfo(undefined, makeFormData());
		expect(result.data).toMatchObject({ usedUserAccount: true });
		expect(mockPrisma.cart.update).not.toHaveBeenCalled();
	});

	it("returns error when no session for guest", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: true,
			context: { userId: undefined, sessionId: null },
		});
		await setGuestContactInfo(undefined, makeFormData());
		expect(mockError).toHaveBeenCalled();
	});

	it("rejects invalid email via validation error", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: "validation_error", message: "invalid email" },
		});
		const result = await setGuestContactInfo(undefined, makeFormData("not-an-email"));
		expect(result).toEqual({ status: "validation_error", message: "invalid email" });
	});

	it("persists guestEmail + consent + contactAt + invalidates cache", async () => {
		await setGuestContactInfo(undefined, makeFormData());
		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cart-1" },
				data: expect.objectContaining({
					guestEmail: "guest@example.com",
					marketingConsent: true,
					guestContactAt: expect.any(Date),
				}),
			}),
		);
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-tag");
	});
});
