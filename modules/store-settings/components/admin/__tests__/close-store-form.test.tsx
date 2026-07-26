import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRouterPush,
	mockFormReset,
	mockClosureMessage,
	mockIsPending,
	mockFormAction,
	mockUseActionState,
	mockTriggerHaptic,
	mockWithCallbacksCallbacks,
	mockFocusFirstInvalid,
	mockOnInvalidCapture,
} = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockFormReset: vi.fn(),
	mockClosureMessage: { value: "" },
	mockIsPending: { value: false },
	mockFormAction: vi.fn(),
	mockUseActionState: vi.fn(),
	mockTriggerHaptic: vi.fn(),
	mockWithCallbacksCallbacks: { current: null as Record<string, (r: unknown) => void> | null },
	mockFocusFirstInvalid: vi.fn(),
	mockOnInvalidCapture: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof React>();
	return {
		...actual,
		useActionState: (
			action: (prev: unknown, fd: FormData) => Promise<unknown>,
			initial: unknown,
		) => {
			mockUseActionState(action, initial);
			return [initial, mockFormAction, mockIsPending.value];
		},
	};
});

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		AppField: ({ children, name }: any) => {
			const field = {
				TextareaField: (props: any) => (
					<div data-testid={`field-${name}`}>
						<label htmlFor={name}>{props.label}</label>
						<textarea
							id={name}
							name={name}
							disabled={props.disabled}
							required={props.required}
							enterKeyHint={props.enterKeyHint}
							autoCapitalize={props.autoCapitalize}
							maxLength={props.maxLength}
							rows={props.rows}
						/>
					</div>
				),
				DateTimeField: (props: any) => (
					<div data-testid={`field-${name}`}>
						<label htmlFor={name}>{props.label}</label>
						<input id={name} name={name} type="datetime-local" disabled={props.disabled} />
					</div>
				),
			};
			return <div>{children(field)}</div>;
		},
		Subscribe: ({ children, selector }: any) => {
			const state = {
				values: { closureMessage: mockClosureMessage.value, reopensAt: "" },
			};
			const result = selector ? selector(state) : state;
			return <div>{children(result)}</div>;
		},
		reset: mockFormReset,
		state: { isValid: true },
	}),
}));

vi.mock("@/shared/hooks/use-focus-first-error", () => ({
	useFocusFirstError: () => ({
		formRef: { current: null },
		focusFirstInvalid: mockFocusFirstInvalid,
		onInvalidCapture: mockOnInvalidCapture,
	}),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
	// `FormServerErrorAlert` (alerte d'erreur serveur inline) consomme le hook.
	useHaptic: () => mockTriggerHaptic,
}));

vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: () => ({
		onSuccess: vi.fn(),
		onError: vi.fn(),
	}),
}));

vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (fn: unknown, callbacks: Record<string, (r: unknown) => void>) => {
		mockWithCallbacksCallbacks.current = callbacks;
		return fn;
	},
}));

vi.mock("../../../actions/close-store", () => ({
	closeStore: vi.fn(),
}));

import { CloseStoreForm } from "../close-store-form";

afterEach(cleanup);

beforeEach(() => {
	vi.clearAllMocks();
	mockClosureMessage.value = "";
	mockIsPending.value = false;
	mockWithCallbacksCallbacks.current = null;
});

describe("CloseStoreForm", () => {
	it("renders closureMessage + reopensAt fields", () => {
		render(<CloseStoreForm />);
		expect(screen.getByTestId("field-closureMessage")).toBeInTheDocument();
		expect(screen.getByTestId("field-reopensAt")).toBeInTheDocument();
	});

	it("renders a submit button with destructive variant and View Transition name", () => {
		render(<CloseStoreForm />);
		const submit = screen.getByRole("button", { name: /Fermer la boutique/i });
		expect(submit).toHaveAttribute("type", "submit");
		expect(submit).toHaveStyle({ viewTransitionName: "store-status-action" });
	});

	it("disables submit when closureMessage is empty", () => {
		mockClosureMessage.value = "";
		render(<CloseStoreForm />);
		expect(screen.getByRole("button", { name: /Fermer la boutique/i })).toBeDisabled();
	});

	it("disables submit when closureMessage is only whitespace", () => {
		mockClosureMessage.value = "   ";
		render(<CloseStoreForm />);
		expect(screen.getByRole("button", { name: /Fermer la boutique/i })).toBeDisabled();
	});

	it("enables submit when closureMessage has content", () => {
		mockClosureMessage.value = "Congés annuels";
		render(<CloseStoreForm />);
		expect(screen.getByRole("button", { name: /Fermer la boutique/i })).not.toBeDisabled();
	});

	it("triggers 'medium' haptic on submit click", () => {
		mockClosureMessage.value = "Test";
		render(<CloseStoreForm />);
		fireEvent.click(screen.getByRole("button", { name: /Fermer la boutique/i }));
		expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
	});

	it("sets aria-busy on form while pending", () => {
		mockIsPending.value = true;
		render(<CloseStoreForm />);
		const form = screen.getByRole("button", { name: /Fermeture…/i }).closest("form");
		expect(form).toHaveAttribute("aria-busy", "true");
	});

	it("shows 'Fermeture...' label and spinner while pending", () => {
		mockIsPending.value = true;
		render(<CloseStoreForm />);
		expect(screen.getByRole("button", { name: /Fermeture…/i })).toBeDisabled();
	});

	it("redirects to /admin/configuration/boutique and resets form on success", () => {
		mockClosureMessage.value = "Test";
		render(<CloseStoreForm />);

		expect(mockWithCallbacksCallbacks.current).not.toBeNull();
		mockWithCallbacksCallbacks.current?.onSuccess?.({
			status: "success",
			message: "Boutique fermée",
		});

		expect(mockFormReset).toHaveBeenCalledTimes(1);
		expect(mockRouterPush).toHaveBeenCalledWith("/admin/configuration/boutique");
	});

	it("wires onInvalidCapture from useFocusFirstError to the form", () => {
		render(<CloseStoreForm />);
		const form = screen.getByRole("button", { name: /Fermer la boutique/i }).closest("form")!;
		fireEvent.invalid(form, { bubbles: true });
		// onInvalidCapture is the capture-phase handler; fireEvent.invalid bubbles
		// through and triggers it when declared via the `onInvalidCapture` prop.
		expect(mockOnInvalidCapture).toHaveBeenCalled();
	});
});
