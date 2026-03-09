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
		useEffect: (fn: () => void) => fn(), // Execute immediately in tests
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
	DRAFT_VERSION: 1,
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
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

// ============================================================================
// Mock localStorage
// ============================================================================

const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
})();

vi.stubGlobal("localStorage", localStorageMock);

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
		// Reset localStorage
		localStorage.clear();
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

// ============================================================================
// Tests: localStorage draft restoration
// ============================================================================

describe("useCheckoutForm — draft restoration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("restores a valid draft from localStorage", () => {
		const mockForm = setupDefaults();

		const draft = {
			version: 1,
			timestamp: Date.now(),
			email: "test@example.com",
			shipping: {
				fullName: "Marie Curie",
				addressLine1: "1 Rue de la Science",
				city: "Paris",
				postalCode: "75005",
				country: "FR",
			},
		};
		localStorage.setItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT, JSON.stringify(draft));

		renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(mockForm.setFieldValue).toHaveBeenCalledWith("email", "test@example.com");
		expect(mockForm.setFieldValue).toHaveBeenCalledWith("shipping.fullName", "Marie Curie");
		expect(mockForm.setFieldValue).toHaveBeenCalledWith(
			"shipping.addressLine1",
			"1 Rue de la Science",
		);
	});

	it("ignores a draft with wrong DRAFT_VERSION", () => {
		const mockForm = setupDefaults();

		const draft = {
			version: 999,
			timestamp: Date.now(),
			email: "old@example.com",
		};
		localStorage.setItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT, JSON.stringify(draft));

		renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(mockForm.setFieldValue).not.toHaveBeenCalled();
		// Draft should be removed
		expect(localStorage.getItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT)).toBeNull();
	});

	it("ignores an expired draft (> 1 hour)", () => {
		const mockForm = setupDefaults();

		const draft = {
			version: 1,
			timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
			email: "expired@example.com",
		};
		localStorage.setItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT, JSON.stringify(draft));

		renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(mockForm.setFieldValue).not.toHaveBeenCalled();
		expect(localStorage.getItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT)).toBeNull();
	});

	it("removes a corrupted draft (invalid JSON)", () => {
		setupDefaults();

		localStorage.setItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT, "not-valid-json{{{");

		renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(localStorage.getItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT)).toBeNull();
	});

	it("handles legacy drafts with firstName/lastName → fullName", () => {
		const mockForm = setupDefaults();

		const draft = {
			version: 1,
			timestamp: Date.now(),
			shipping: {
				firstName: "Jean",
				lastName: "Dupont",
			},
		};
		localStorage.setItem(STORAGE_KEYS.CHECKOUT_FORM_DRAFT, JSON.stringify(draft));

		renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(mockForm.setFieldValue).toHaveBeenCalledWith("shipping.fullName", "Jean Dupont");
	});

	it("does nothing when no draft exists in localStorage", () => {
		const mockForm = setupDefaults();

		renderHook(() => useCheckoutForm({ session: null, addresses: null }));

		expect(mockForm.setFieldValue).not.toHaveBeenCalled();
	});
});
