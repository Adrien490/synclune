import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHaptic, mockRouter, mockUseIsMobile, mockUpdateColor, mockUseUnsavedChanges } =
	vi.hoisted(() => ({
		mockHaptic: vi.fn(),
		mockRouter: { push: vi.fn() },
		mockUseIsMobile: vi.fn(() => false),
		mockUpdateColor: vi.fn(),
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
	MOBILE_MEDIA_QUERY: "(width < 48rem)",
}));
vi.mock("@/shared/hooks/use-unsaved-changes", () => ({
	useUnsavedChanges: mockUseUnsavedChanges,
}));
vi.mock("@/modules/colors/actions/update-color", () => ({ updateColor: mockUpdateColor }));
vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

import { EditColorForm } from "../edit-color-form";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockUpdateColor.mockResolvedValue({ status: ActionStatus.SUCCESS, message: "Couleur modifiée" });
});

const baseColor = {
	id: "color-1",
	name: "Or rose 18K",
	slug: "or-rose-18k",
	hex: "#B76E79",
	description: "Or alliage cuivre" as string | null,
	isActive: true,
};

describe("EditColorForm", () => {
	it("pre-fills inputs with the color values", () => {
		render(<EditColorForm color={baseColor} />);
		const nameInput = screen.getByLabelText(/^Nom/, { selector: "input" }) as HTMLInputElement;
		expect(nameInput.value).toBe("Or rose 18K");
		const description = screen.getByLabelText(/Description/, {
			selector: "textarea",
		}) as HTMLTextAreaElement;
		expect(description.value).toBe("Or alliage cuivre");
	});

	it("accepts a color with null description and renders an empty textarea", () => {
		render(<EditColorForm color={{ ...baseColor, description: null }} />);
		const description = screen.getByLabelText(/Description/, {
			selector: "textarea",
		}) as HTMLTextAreaElement;
		expect(description.value).toBe("");
	});

	it("submit button renders the Enregistrer label", () => {
		render(<EditColorForm color={baseColor} />);
		expect(screen.getByRole("button", { name: /Enregistrer/ })).toBeInTheDocument();
	});

	it("submits with id input as hidden field", () => {
		const { container } = render(<EditColorForm color={baseColor} />);
		const hidden = container.querySelector('input[type="hidden"][name="id"]');
		expect(hidden).toHaveAttribute("value", "color-1");
	});

	// Audit 2026-07-26 : ce test verrouillait l'inverse (`enabled === false` sur
	// mobile), laissant la saisie mobile sans aucune garde.
	it("on mobile, engages the unsaved-changes guard", () => {
		mockUseIsMobile.mockReturnValue(true);
		render(<EditColorForm color={baseColor} />);
		const calls = mockUseUnsavedChanges.mock.calls as unknown as Array<[boolean, boolean]>;
		expect(calls[calls.length - 1]?.[1]).toBe(true);
	});

	it("calls updateColor on submit", async () => {
		render(<EditColorForm color={baseColor} />);
		const nameInput = screen.getByLabelText(/^Nom/, { selector: "input" });
		fireEvent.change(nameInput, { target: { value: "Or rose 14K" } });

		const button = screen.getByRole("button", { name: /Enregistrer/ });
		fireEvent.click(button);

		await waitFor(() => {
			expect(mockUpdateColor).toHaveBeenCalled();
		});
	});
});
