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

// Note: getCheckoutFormOptions is intentionally NOT mocked here — we let it
// run for real so we can assert that useAppForm receives the correct derived
// defaultValues (session email, address pre-fill, etc.).
// Mocking the auth module avoids Prisma/server-only imports.
vi.mock("@/modules/auth/lib/auth", () => ({}));

import { useCheckoutForm } from "../use-checkout-form";

// ============================================================================
// Fixtures
// ============================================================================

const mockSession = {
	user: {
		id: "user-1",
		email: "user@example.com",
		name: "Jean Dupont",
		role: "USER",
	},
	session: { id: "sess-1" },
} as never;

// ============================================================================
// Helpers
// ============================================================================

function createMockForm() {
	return {
		setFieldValue: vi.fn(),
		store: {},
		state: { values: {} },
	};
}

function setup() {
	const mockForm = createMockForm();
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

	// --------------------------------------------------------------------------
	// Return shape
	// --------------------------------------------------------------------------

	it("returns an object with a form property", () => {
		setup();

		const { result } = renderHook(() => useCheckoutForm({ session: null }));

		expect(result.current).toHaveProperty("form");
	});

	it("returns exactly the form instance from useAppForm", () => {
		const mockForm = setup();

		const { result } = renderHook(() => useCheckoutForm({ session: null }));

		expect(result.current.form).toBe(mockForm);
	});

	// --------------------------------------------------------------------------
	// useAppForm call count
	// --------------------------------------------------------------------------

	it("calls useAppForm exactly once on mount", () => {
		setup();

		renderHook(() => useCheckoutForm({ session: null }));

		expect(mockUseAppForm).toHaveBeenCalledTimes(1);
	});

	// --------------------------------------------------------------------------
	// Guest defaults (null session, null addresses)
	// --------------------------------------------------------------------------

	it("passe une validationLogic (validation au blur, pas à la frappe)", () => {
		// Sans `validationLogic`, TanStack retombe sur `defaultValidationLogic` et les
		// validateurs `onDynamic` du tunnel ne tourneraient JAMAIS — formulaire
		// silencieusement non validé côté client. Audit UI/UX paiement 2026-07-26, F1.
		setup();

		renderHook(() => useCheckoutForm({ session: null }));

		expect(mockUseAppForm).toHaveBeenCalledWith(
			expect.objectContaining({
				validationLogic: expect.any(Function),
			}),
		);
	});

	it("calls useAppForm with empty email for guest users", () => {
		setup();

		renderHook(() => useCheckoutForm({ session: null }));

		expect(mockUseAppForm).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultValues: expect.objectContaining({
					email: "",
				}),
			}),
		);
	});

	it("calls useAppForm with empty shipping fields for guest with no addresses", () => {
		setup();

		renderHook(() => useCheckoutForm({ session: null }));

		expect(mockUseAppForm).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultValues: expect.objectContaining({
					shipping: expect.objectContaining({
						fullName: "",
						addressLine1: "",
						city: "",
						postalCode: "",
						country: "FR",
					}),
				}),
			}),
		);
	});

	it("calls useAppForm with empty discountCode by default", () => {
		setup();

		renderHook(() => useCheckoutForm({ session: null }));

		expect(mockUseAppForm).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultValues: expect.objectContaining({
					discountCode: "",
					_appliedDiscount: null,
					_discountOpen: false,
				}),
			}),
		);
	});

	// --------------------------------------------------------------------------
	// useAppForm receives an onSubmit handler
	// --------------------------------------------------------------------------

	it("calls useAppForm with an onSubmit function", () => {
		setup();

		renderHook(() => useCheckoutForm({ session: null }));

		expect(mockUseAppForm).toHaveBeenCalledWith(
			expect.objectContaining({
				onSubmit: expect.any(Function),
			}),
		);
	});
});
