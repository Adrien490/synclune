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
vi.mock("@/modules/orders/hooks/use-update-order-shipping-address", () => ({
	useUpdateOrderShippingAddress: (onSuccess: () => void) => mockUseHook(onSuccess),
}));
vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

import { EditShippingAddressForm } from "../edit-shipping-address-form";

const baseProps = {
	orderId: "order-1",
	orderNumber: "SYN-2026-0001",
	shippingFirstName: "Marie",
	shippingLastName: "Dupont",
	shippingAddress1: "12 Rue de la Paix",
	shippingAddress2: "Bât. B" as string | null,
	shippingPostalCode: "75001",
	shippingCity: "Paris",
	shippingCountry: "FR",
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockUseHook.mockReturnValue({ action: mockAction, isPending: false });
});

describe("EditShippingAddressForm", () => {
	it("pré-remplit les champs d'adresse", () => {
		render(<EditShippingAddressForm {...baseProps} />);
		expect((screen.getByLabelText(/Prénom/) as HTMLInputElement).value).toBe("Marie");
		expect((screen.getByLabelText(/^Nom/) as HTMLInputElement).value).toBe("Dupont");
		expect((screen.getByLabelText(/^Adresse/) as HTMLInputElement).value).toBe("12 Rue de la Paix");
		expect((screen.getByLabelText(/Code postal/) as HTMLInputElement).value).toBe("75001");
		expect((screen.getByLabelText(/Ville/) as HTMLInputElement).value).toBe("Paris");
	});

	it("rend un complément d'adresse vide quand null", () => {
		render(<EditShippingAddressForm {...baseProps} shippingAddress2={null} />);
		expect((screen.getByLabelText(/Complément/) as HTMLInputElement).value).toBe("");
	});

	it("expose l'id de commande en champ caché", () => {
		const { container } = render(<EditShippingAddressForm {...baseProps} />);
		expect(container.querySelector('input[type="hidden"][name="id"]')).toHaveAttribute(
			"value",
			"order-1",
		);
	});

	it("appelle l'action à la soumission", async () => {
		render(<EditShippingAddressForm {...baseProps} />);
		fireEvent.click(screen.getByRole("button", { name: /Enregistrer l'adresse/ }));
		await waitFor(() => expect(mockAction).toHaveBeenCalled());
	});

	it("désactive le bouton pendant la soumission", () => {
		mockUseHook.mockReturnValue({ action: mockAction, isPending: true });
		render(<EditShippingAddressForm {...baseProps} />);
		expect(screen.getByRole("button", { name: /Mise à jour/ })).toBeDisabled();
	});
});
