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
	mockGetStoreSettings,
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
	mockGetStoreSettings: vi.fn(),
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
vi.mock("@/modules/store-settings/data/get-store-settings", () => ({
	getStoreSettings: mockGetStoreSettings,
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
	// Gate CLICK_AND_COLLECT activé par défaut — les tests qui veulent tester le refus
	// override avec `mockGetStoreSettings.mockResolvedValue({ clickAndCollectEnabled: false })`.
	mockGetStoreSettings.mockResolvedValue({ clickAndCollectEnabled: true });
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

	it("rejects CLICK_AND_COLLECT when StoreSettings.clickAndCollectEnabled is false", async () => {
		mockGetStoreSettings.mockResolvedValue({ clickAndCollectEnabled: false });
		await setFulfillmentMode(undefined, makeFormData("CLICK_AND_COLLECT"));
		expect(mockError).toHaveBeenCalledWith(
			"Le retrait en boutique n'est pas disponible pour le moment.",
		);
		expect(mockPrisma.cart.update).not.toHaveBeenCalled();
	});

	it("rejects CLICK_AND_COLLECT when StoreSettings row is null", async () => {
		mockGetStoreSettings.mockResolvedValue(null);
		await setFulfillmentMode(undefined, makeFormData("CLICK_AND_COLLECT"));
		expect(mockError).toHaveBeenCalledWith(
			"Le retrait en boutique n'est pas disponible pour le moment.",
		);
	});

	it("does not call getStoreSettings for SHIPPING (no extra DB hit)", async () => {
		await setFulfillmentMode(undefined, makeFormData("SHIPPING"));
		expect(mockGetStoreSettings).not.toHaveBeenCalled();
	});
});
