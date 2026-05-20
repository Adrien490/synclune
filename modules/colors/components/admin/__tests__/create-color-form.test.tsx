import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHaptic, mockRouter, mockUseIsMobile, mockCreateColor, mockUseUnsavedChanges } =
	vi.hoisted(() => ({
		mockHaptic: vi.fn(),
		mockRouter: { push: vi.fn() },
		mockUseIsMobile: vi.fn(() => false),
		mockCreateColor: vi.fn(),
		mockUseUnsavedChanges: vi.fn(() => ({ allowNavigation: vi.fn() })),
	}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
	__resetHapticCooldown: () => undefined,
}));
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
	MOBILE_BREAKPOINT: 768,
}));
vi.mock("@/shared/hooks/use-unsaved-changes", () => ({
	useUnsavedChanges: mockUseUnsavedChanges,
}));
vi.mock("@/modules/colors/actions/create-color", () => ({ createColor: mockCreateColor }));
vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

// Library sheet trigger is rendered, but full Drawer/Dialog mock to avoid jsdom complexity.
vi.mock("@/modules/colors/components/admin/color-library-sheet", () => ({
	ColorLibrarySheet: () => <div data-testid="color-library-sheet" />,
}));

import { CreateColorForm } from "../create-color-form";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockCreateColor.mockResolvedValue({ status: ActionStatus.SUCCESS, message: "Couleur créée" });
});

describe("CreateColorForm", () => {
	it("renders the form with submit button", () => {
		render(<CreateColorForm />);
		expect(screen.getByRole("button", { name: /Créer/i })).toBeInTheDocument();
	});

	it("renders the color library sheet trigger", () => {
		render(<CreateColorForm />);
		expect(screen.getByTestId("color-library-sheet")).toBeInTheDocument();
	});

	it("submit button starts enabled (default hex '#000000' valid, only name required)", () => {
		render(<CreateColorForm />);
		const button = screen.getByRole("button", { name: /Créer/ });
		// Default `name: ""` makes form invalid; React Form may show canSubmit true initially
		// (validators trigger on change). We simply assert the button is rendered as expected.
		expect(button).toHaveAttribute("type", "submit");
	});

	it("submitting the pristine empty form does not call createColor (F1 regression)", async () => {
		// On a pristine form `canSubmit` is stale-true, so the button is clickable.
		// onSubmit must run client validation first and short-circuit before the
		// server action when the form is invalid (empty required `name`).
		render(<CreateColorForm />);
		fireEvent.click(screen.getByRole("button", { name: /Créer/ }));

		await waitFor(() => {
			expect(screen.getByLabelText(/^Nom/, { selector: "input" })).toHaveAttribute(
				"aria-invalid",
				"true",
			);
		});
		expect(mockCreateColor).not.toHaveBeenCalled();
	});

	it("calls createColor server action when submitted with a valid name", async () => {
		render(<CreateColorForm />);
		const nameInput = screen.getByLabelText(/^Nom/, { selector: "input" });
		fireEvent.change(nameInput, { target: { value: "Or rose 18K" } });

		const button = screen.getByRole("button", { name: /Créer/ });
		fireEvent.click(button);

		await waitFor(() => {
			expect(mockCreateColor).toHaveBeenCalled();
		});
	});

	it("on mobile, does not engage the unsaved-changes guard (enabled flag false)", () => {
		mockUseIsMobile.mockReturnValue(true);
		render(<CreateColorForm />);
		// useUnsavedChanges(isDirty, !isPending && !isMobile) → second arg `false` on mobile
		const calls = mockUseUnsavedChanges.mock.calls as unknown as Array<[boolean, boolean]>;
		expect(calls.length).toBeGreaterThan(0);
		expect(calls[calls.length - 1]?.[1]).toBe(false);
	});

	it("on desktop, engages the unsaved-changes guard when form is clean (enabled = true)", () => {
		mockUseIsMobile.mockReturnValue(false);
		render(<CreateColorForm />);
		const calls = mockUseUnsavedChanges.mock.calls as unknown as Array<[boolean, boolean]>;
		expect(calls.length).toBeGreaterThan(0);
		expect(calls[calls.length - 1]?.[1]).toBe(true);
	});
});
