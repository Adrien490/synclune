import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockEditShippingOpen, mockHaptic, mockPush } = vi.hoisted(() => ({
	mockEditShippingOpen: vi.fn(),
	mockHaptic: vi.fn(),
	mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, "aria-label": ariaLabel, ...props }: any) => (
		<button onClick={onClick} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	MapPin: () => <svg aria-hidden="true" />,
	Phone: () => <svg aria-hidden="true" />,
	Pencil: () => <svg aria-hidden="true" />,
	ReceiptText: () => <svg aria-hidden="true" />,
}));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ label }: any) => <button aria-label={`Copier ${label}`} />,
}));

vi.mock("@/shared/constants/countries", () => ({
	COUNTRY_NAMES: { FR: "France", BE: "Belgique" },
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	FulfillmentStatus: {
		UNFULFILLED: "UNFULFILLED",
		PARTIAL: "PARTIAL",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
	},
	InvoiceStatus: {
		PENDING: "PENDING",
		GENERATED: "GENERATED",
	},
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: (id: string) => ({
		open: id === "edit-shipping-address" ? mockEditShippingOpen : vi.fn(),
		close: vi.fn(),
		isOpen: false,
		data: null,
	}),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("../../edit-shipping-address-dialog", () => ({
	EDIT_SHIPPING_ADDRESS_DIALOG_ID: "edit-shipping-address",
}));

import { OrderAddressCard } from "../order-address-card";

afterEach(() => {
	cleanup();
	mockEditShippingOpen.mockReset();
	mockHaptic.mockReset();
});

function createOrder(overrides = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		shippingFirstName: "Marie",
		shippingLastName: "Dupont",
		shippingAddress1: "12 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: null,
		fulfillmentStatus: "UNFULFILLED",
		// Gate sur invoiceNumber (P1-B audit 2026-08-01) : null = pas de facture
		// émise → éditable. VOIDED conserve son numéro, donc reste verrouillé.
		invoiceNumber: null,
		invoiceStatus: null,
		...overrides,
	} as any;
}

describe("OrderAddressCard", () => {
	it("renders the Livraison title", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("Livraison")).toBeInTheDocument();
	});

	// @regression order-single-address (2026-08-04) : les 9 colonnes `billing*`
	// sont parties — la carte ne doit plus offrir de section ni de bouton de
	// facturation, sous peine de reproposer une édition sans destination.
	it("n'affiche plus AUCUNE surface de facturation", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.queryByText("Facturation")).toBeNull();
		expect(screen.queryByText(/Identique à l'adresse de livraison/i)).toBeNull();
		expect(screen.queryByRole("button", { name: /facturation/i })).toBeNull();
	});

	it("shows full name", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
	});

	it("shows address line 1", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("12 rue de la Paix")).toBeInTheDocument();
	});

	it("shows postal code and city", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("75001 Paris")).toBeInTheDocument();
	});

	it("shows resolved country label", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("France")).toBeInTheDocument();
	});

	it("shows address2 when present", () => {
		render(<OrderAddressCard order={createOrder({ shippingAddress2: "Appartement 3B" })} />);
		expect(screen.getByText("Appartement 3B")).toBeInTheDocument();
	});

	it("hides address2 when null", () => {
		render(<OrderAddressCard order={createOrder({ shippingAddress2: null })} />);
		expect(screen.queryByText(/Appartement/)).toBeNull();
	});

	it("shows phone when shippingPhone is present", () => {
		render(<OrderAddressCard order={createOrder({ shippingPhone: "+33698765432" })} />);
		expect(screen.getByText("+33698765432")).toBeInTheDocument();
	});

	it("hides phone when shippingPhone is null", () => {
		render(<OrderAddressCard order={createOrder({ shippingPhone: null })} />);
		expect(screen.queryByText(/\+336/)).toBeNull();
	});

	it("shows Modifier shipping button before shipment", () => {
		render(<OrderAddressCard order={createOrder({ fulfillmentStatus: "UNFULFILLED" })} />);
		expect(
			screen.getByRole("button", { name: /Modifier l'adresse de livraison/i }),
		).toBeInTheDocument();
	});

	it("hides Modifier shipping button after shipment", () => {
		render(<OrderAddressCard order={createOrder({ fulfillmentStatus: "SHIPPED" })} />);
		expect(screen.queryByRole("button", { name: /Modifier l'adresse de livraison/i })).toBeNull();
	});

	it("opens shipping edit dialog on Modifier click", () => {
		render(<OrderAddressCard order={createOrder()} />);
		fireEvent.click(screen.getByRole("button", { name: /Modifier l'adresse de livraison/i }));
		expect(mockEditShippingOpen).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				orderNumber: "CMD-001",
				shippingPostalCode: "75001",
			}),
		);
		expect(mockHaptic).toHaveBeenCalledWith("light");
	});
});
