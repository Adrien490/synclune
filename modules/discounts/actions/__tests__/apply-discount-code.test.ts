import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockValidateDiscountCode, mockSuccess, mockError } = vi.hoisted(() => ({
	mockValidateDiscountCode: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
}));

vi.mock("../validate-discount-code", () => ({ validateDiscountCode: mockValidateDiscountCode }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	success: mockSuccess,
	error: mockError,
}));

import { applyDiscountCode } from "../apply-discount-code";

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

const validDiscount = {
	id: "disc-123",
	code: "SUMMER20",
	type: "PERCENTAGE",
	value: 20,
	discountAmount: 1000,
};

// ============================================================================
// TESTS
// ============================================================================

describe("applyDiscountCode", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: discount code is valid
		mockValidateDiscountCode.mockResolvedValue({
			valid: true,
			discount: { ...validDiscount },
		});

		// Default: success/error helpers return shaped ActionState
		mockSuccess.mockImplementation((message: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
	});

	// ──────────────────────────────────────────────────────────────
	// Missing code
	// ──────────────────────────────────────────────────────────────

	it("should return error when code is missing from formData", async () => {
		const formData = createFormData({ subtotal: "5000" });
		const result = await applyDiscountCode(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Code promo requis");
		expect(mockValidateDiscountCode).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// validateDiscountCode delegation
	// ──────────────────────────────────────────────────────────────

	it("should call validateDiscountCode with code and subtotal from formData", async () => {
		const formData = createFormData({ code: "WINTER10", subtotal: "7500" });
		await applyDiscountCode(undefined, formData);

		expect(mockValidateDiscountCode).toHaveBeenCalledWith("WINTER10", 7500);
	});

	it("should correctly parse subtotal as number from formData", async () => {
		const formData = createFormData({ code: "SUMMER20", subtotal: "12345" });
		await applyDiscountCode(undefined, formData);

		const [, subtotalArg] = mockValidateDiscountCode.mock.calls[0]!;
		expect(typeof subtotalArg).toBe("number");
		expect(subtotalArg).toBe(12345);
	});

	// ──────────────────────────────────────────────────────────────
	// Success path
	// ──────────────────────────────────────────────────────────────

	it("should return success with discount data when code is valid", async () => {
		const formData = createFormData({ code: "SUMMER20", subtotal: "5000" });
		const result = await applyDiscountCode(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith('Code "SUMMER20" appliqué', validDiscount);
		expect(result.data).toEqual(validDiscount);
	});

	// ──────────────────────────────────────────────────────────────
	// Error paths
	// ──────────────────────────────────────────────────────────────

	it("should return error with specific message when code is invalid", async () => {
		mockValidateDiscountCode.mockResolvedValue({
			valid: false,
			error: "Code expiré",
		});

		const formData = createFormData({ code: "EXPIRED", subtotal: "5000" });
		const result = await applyDiscountCode(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Code expiré");
	});

	it('should return generic "Code invalide" when no error message is provided', async () => {
		mockValidateDiscountCode.mockResolvedValue({
			valid: false,
			error: undefined,
		});

		const formData = createFormData({ code: "BAD", subtotal: "5000" });
		const result = await applyDiscountCode(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockError).toHaveBeenCalledWith("Code invalide");
	});

	it("should not call success when validateDiscountCode returns valid: false", async () => {
		mockValidateDiscountCode.mockResolvedValue({
			valid: false,
			error: "Montant minimum non atteint",
		});

		const formData = createFormData({ code: "MIN50", subtotal: "1000" });
		await applyDiscountCode(undefined, formData);

		expect(mockSuccess).not.toHaveBeenCalled();
	});

	it("should not call error when validateDiscountCode returns valid: true", async () => {
		const formData = createFormData({ code: "SUMMER20", subtotal: "5000" });
		await applyDiscountCode(undefined, formData);

		expect(mockError).not.toHaveBeenCalled();
	});
});
