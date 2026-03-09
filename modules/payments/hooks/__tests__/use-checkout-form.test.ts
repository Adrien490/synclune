import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseActionState, mockUseAppForm, mockMergeForm, mockUseStore, mockUseTransform } =
	vi.hoisted(() => ({
		mockUseActionState: vi.fn(),
		mockUseAppForm: vi.fn(),
		mockMergeForm: vi.fn(),
		mockUseStore: vi.fn(),
		mockUseTransform: vi.fn(),
	}));

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useActionState: mockUseActionState,
	};
});

vi.mock("@/shared/components/forms", () => ({
	useAppForm: mockUseAppForm,
}));

vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: mockMergeForm,
	useStore: mockUseStore,
	useTransform: mockUseTransform,
}));

vi.mock("@/modules/payments/actions/create-checkout-session", () => ({
	createCheckoutSession: vi.fn(),
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: (callbacks: Record<string, unknown>) => callbacks,
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown) => action,
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
			termsAccepted: false,
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
	mockUseActionState.mockReturnValue([undefined, vi.fn(), false]);
	mockUseAppForm.mockReturnValue(mockForm);
	mockUseStore.mockReturnValue([]);
	mockUseTransform.mockReturnValue(undefined);
	mockMergeForm.mockReturnValue(undefined);
	return mockForm;
}

// ============================================================================
// Tests
// ============================================================================

describe("useCheckoutForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns form, state, action, and isPending", () => {
		setupDefaults();

		const { result } = renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(result.current).toHaveProperty("form");
		expect(result.current).toHaveProperty("state");
		expect(result.current).toHaveProperty("action");
		expect(result.current).toHaveProperty("isPending");
	});

	it("calls useActionState with the action", () => {
		setupDefaults();

		renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(mockUseActionState).toHaveBeenCalled();
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
