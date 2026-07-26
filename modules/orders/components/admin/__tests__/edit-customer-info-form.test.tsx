import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockHaptic, mockRouter, mockUseIsMobile, mockAction, mockUseUnsavedChanges, mockUseHook } =
	vi.hoisted(() => ({
		mockHaptic: vi.fn(),
		mockRouter: { push: vi.fn() },
		mockUseIsMobile: vi.fn(() => false),
		mockAction: vi.fn(),
		mockUseUnsavedChanges: vi.fn(() => ({ allowNavigation: vi.fn() })),
		mockUseHook: vi.fn(),
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
vi.mock("@/modules/orders/hooks/use-update-order-customer-info", () => ({
	useUpdateOrderCustomerInfo: (onSuccess: () => void) => mockUseHook(onSuccess),
}));
vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

import { EditCustomerInfoForm } from "../edit-customer-info-form";

const baseProps = {
	orderId: "order-1",
	orderNumber: "SYN-2026-0001",
	customerEmail: "marie@example.com",
	customerName: "Marie Dupont",
	customerPhone: "06 12 34 56 78" as string | null,
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockUseHook.mockReturnValue({ action: mockAction, isPending: false });
});

describe("EditCustomerInfoForm", () => {
	it("pré-remplit les champs avec les valeurs client", () => {
		render(<EditCustomerInfoForm {...baseProps} />);
		expect((screen.getByLabelText(/Nom complet/) as HTMLInputElement).value).toBe("Marie Dupont");
		expect((screen.getByLabelText(/^Email/) as HTMLInputElement).value).toBe("marie@example.com");
		expect((screen.getByLabelText(/Téléphone/) as HTMLInputElement).value).toBe("06 12 34 56 78");
	});

	it("rend un téléphone vide quand customerPhone est null", () => {
		render(<EditCustomerInfoForm {...baseProps} customerPhone={null} />);
		expect((screen.getByLabelText(/Téléphone/) as HTMLInputElement).value).toBe("");
	});

	it("expose l'id de commande en champ caché", () => {
		const { container } = render(<EditCustomerInfoForm {...baseProps} />);
		const hidden = container.querySelector('input[type="hidden"][name="id"]');
		expect(hidden).toHaveAttribute("value", "order-1");
	});

	it("rend le bouton d'enregistrement", () => {
		render(<EditCustomerInfoForm {...baseProps} />);
		expect(screen.getByRole("button", { name: /Enregistrer les infos/ })).toBeInTheDocument();
	});

	it("appelle l'action à la soumission", async () => {
		render(<EditCustomerInfoForm {...baseProps} />);
		fireEvent.change(screen.getByLabelText(/Nom complet/), { target: { value: "Marie Martin" } });
		fireEvent.click(screen.getByRole("button", { name: /Enregistrer les infos/ }));
		await waitFor(() => expect(mockAction).toHaveBeenCalled());
	});

	it("désactive le bouton pendant la soumission", () => {
		mockUseHook.mockReturnValue({ action: mockAction, isPending: true });
		render(<EditCustomerInfoForm {...baseProps} />);
		expect(screen.getByRole("button", { name: /Mise à jour/ })).toBeDisabled();
	});

	// Audit 2026-07-26 : ce test verrouillait l'inverse (`enabled === false` sur
	// mobile), laissant la saisie mobile sans aucune garde.
	it("engage le guard de modifications non enregistrées sur mobile", () => {
		mockUseIsMobile.mockReturnValue(true);
		render(<EditCustomerInfoForm {...baseProps} />);
		const calls = mockUseUnsavedChanges.mock.calls as unknown as Array<[boolean, boolean]>;
		expect(calls[calls.length - 1]?.[1]).toBe(true);
	});
});
