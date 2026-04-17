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
	setCartNotesSchema: {},
}));

import { setCartNotes } from "../set-cart-notes";

function makeFormData(notes = "Gravure initiales AB") {
	const fd = new FormData();
	fd.set("notes", notes);
	return fd;
}

function setupDefaults() {
	mockCheckCartRateLimit.mockResolvedValue({
		success: true,
		context: { userId: "user-1", sessionId: null },
	});
	mockValidateInput.mockImplementation((_s: unknown, data: { notes: string }) => ({ data }));
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

describe("setCartNotes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("persists trimmed notes", async () => {
		await setCartNotes(undefined, makeFormData("  Emballage separe  "));
		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ notes: "Emballage separe" }),
			}),
		);
	});

	it("clears notes when empty string", async () => {
		await setCartNotes(undefined, makeFormData(""));
		expect(mockPrisma.cart.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ notes: null }),
			}),
		);
	});

	it("returns rate limit error", async () => {
		mockCheckCartRateLimit.mockResolvedValue({
			success: false,
			errorState: { status: "error", message: "rate" },
		});
		const result = await setCartNotes(undefined, makeFormData());
		expect(result).toEqual({ status: "error", message: "rate" });
	});
});
