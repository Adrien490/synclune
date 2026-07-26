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
vi.mock("@/modules/orders/hooks/use-update-order-billing-address", () => ({
	useUpdateOrderBillingAddress: (onSuccess: () => void) => mockUseHook(onSuccess),
}));
vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

import { EditBillingAddressForm } from "../edit-billing-address-form";

const baseProps = {
	orderId: "order-1",
	orderNumber: "SYN-2026-0001",
	billingSameAsShipping: false,
	billingFirstName: "Marie",
	billingLastName: "Dupont",
	billingAddress1: "12 Rue de la Paix",
	billingAddress2: null,
	billingPostalCode: "75001",
	billingCity: "Paris",
	billingCountry: "FR",
	billingPhone: "06 12 34 56 78",
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	mockUseHook.mockReturnValue({ action: mockAction, isPending: false });
});

describe("EditBillingAddressForm", () => {
	it("affiche les champs détaillés quand billingSameAsShipping est false", () => {
		render(<EditBillingAddressForm {...baseProps} />);
		expect(screen.getByLabelText(/Prénom/)).toBeInTheDocument();
		expect(screen.getByLabelText(/Adresse/)).toBeInTheDocument();
		expect((screen.getByLabelText(/Téléphone/) as HTMLInputElement).value).toBe("06 12 34 56 78");
	});

	it("masque les champs détaillés quand 'reprendre l'adresse de livraison' est coché", () => {
		render(<EditBillingAddressForm {...baseProps} billingSameAsShipping={true} />);
		expect(screen.queryByLabelText(/Prénom/)).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/^Adresse/)).not.toBeInTheDocument();
	});

	it("expose billingSameAsShipping en champ caché et le bascule au clic", () => {
		const { container } = render(<EditBillingAddressForm {...baseProps} />);
		const hidden = () =>
			container.querySelector('input[type="hidden"][name="billingSameAsShipping"]');
		expect(hidden()).toHaveAttribute("value", "false");

		// Cocher la case masque les champs et bascule le champ caché à "true".
		fireEvent.click(screen.getByRole("checkbox"));
		expect(hidden()).toHaveAttribute("value", "true");
		expect(screen.queryByLabelText(/Prénom/)).not.toBeInTheDocument();
	});

	it("expose l'id de commande en champ caché", () => {
		const { container } = render(<EditBillingAddressForm {...baseProps} />);
		expect(container.querySelector('input[type="hidden"][name="id"]')).toHaveAttribute(
			"value",
			"order-1",
		);
	});

	it("appelle l'action à la soumission", async () => {
		render(<EditBillingAddressForm {...baseProps} />);
		fireEvent.click(screen.getByRole("button", { name: /Enregistrer l'adresse/ }));
		await waitFor(() => expect(mockAction).toHaveBeenCalled());
	});
});
