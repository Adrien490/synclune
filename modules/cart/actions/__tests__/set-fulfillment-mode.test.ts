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
	setFulfillmentModeSchema: {},
}));

import { setFulfillmentMode } from "../set-fulfillment-mode";

function makeFormData(type = "CLICK_AND_COLLECT") {
	const fd = new FormData();
	fd.set("fulfillmentType", type);
	return fd;
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockValidateInput.mockImplementation((_s: unknown, data: { fulfillmentType: string }) => ({
		data,
	}));
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

describe("setFulfillmentMode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("persists fulfillmentType SHIPPING", async () => {
		await setFulfillmentMode(undefined, makeFormData("SHIPPING"));
		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ fulfillmentType: "SHIPPING" }),
			}),
		);
	});

	it("persists fulfillmentType CLICK_AND_COLLECT", async () => {
		await setFulfillmentMode(undefined, makeFormData("CLICK_AND_COLLECT"));
		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ fulfillmentType: "CLICK_AND_COLLECT" }),
			}),
		);
	});

	it("returns error when no cart", async () => {
		mockPrisma.cart.findFirst.mockResolvedValue(null);
		await setFulfillmentMode(undefined, makeFormData());
		expect(mockError).toHaveBeenCalled();
	});
});
