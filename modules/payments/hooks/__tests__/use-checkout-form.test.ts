import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseAppForm } = vi.hoisted(() => ({
	mockUseAppForm: vi.fn(),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: mockUseAppForm,
}));

vi.mock("../utils/checkout-form.utils", () => ({
	getCheckoutFormOptions: vi.fn().mockReturnValue({
		defaultValues: {
			email: "",
			shipping: {
				fullName: "",
				addressLine1: "",
				addressLine2: "",
				city: "",
				postalCode: "",
				country: "FR",
				phoneNumber: "",
			},
		},
	}),
}));

import { useCheckoutForm } from "../use-checkout-form";

// ============================================================================
// Helpers
// ============================================================================

function createMockForm() {
	return {
		setFieldValue: vi.fn(),
		store: {},
	};
}

function setupDefaults(formOverrides = {}) {
	const mockForm = { ...createMockForm(), ...formOverrides };
	mockUseAppForm.mockReturnValue(mockForm);
	return mockForm;
}

// ============================================================================
// Tests
// ============================================================================

describe("useCheckoutForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns form", () => {
		setupDefaults();

		const { result } = renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(result.current).toHaveProperty("form");
	});

	it("calls useAppForm with options from getCheckoutFormOptions", () => {
		setupDefaults();

		renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(mockUseAppForm).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultValues: expect.objectContaining({
					email: "",
					shipping: expect.any(Object),
				}),
			}),
		);
	});
});
