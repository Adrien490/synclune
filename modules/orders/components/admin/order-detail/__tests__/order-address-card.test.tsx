import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockEditShippingOpen, mockEditBillingOpen, mockHaptic } = vi.hoisted(() => ({
	mockEditShippingOpen: vi.fn(),
	mockEditBillingOpen: vi.fn(),
	mockHaptic: vi.fn(),
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
		open: id === "edit-shipping-address" ? mockEditShippingOpen : mockEditBillingOpen,
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

vi.mock("../../edit-billing-address-dialog", () => ({
	EDIT_BILLING_ADDRESS_DIALOG_ID: "edit-billing-address",
}));

import { OrderAddressCard } from "../order-address-card";

afterEach(() => {
	cleanup();
	mockEditShippingOpen.mockReset();
	mockEditBillingOpen.mockReset();
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
		billingSameAsShipping: true,
		billingFirstName: null,
		billingLastName: null,
		billingAddress1: null,
		billingAddress2: null,
		billingPostalCode: null,
		billingCity: null,
		billingCountry: null,
		billingPhone: null,
		fulfillmentStatus: "UNFULFILLED",
		invoiceStatus: "PENDING",
		...overrides,
	} as any;
}

describe("OrderAddressCard", () => {
	it("renders Adresses title", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("Adresses")).toBeInTheDocument();
	});

	it("shows shipping section heading", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("Livraison")).toBeInTheDocument();
	});

	it("shows billing section heading", () => {
		render(<OrderAddressCard order={createOrder()} />);
		expect(screen.getByText("Facturation")).toBeInTheDocument();
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

	it("shows 'Identique à l'adresse de livraison' when billingSameAsShipping", () => {
		render(<OrderAddressCard order={createOrder({ billingSameAsShipping: true })} />);
		expect(screen.getByText(/Identique à l'adresse de livraison/i)).toBeInTheDocument();
	});

	it("shows billing-specific fields when not same as shipping", () => {
		render(
			<OrderAddressCard
				order={createOrder({
					billingSameAsShipping: false,
					billingFirstName: "Jean",
					billingLastName: "Martin",
					billingAddress1: "5 avenue Foch",
					billingPostalCode: "75116",
					billingCity: "Paris",
					billingCountry: "FR",
				})}
			/>,
		);
		expect(screen.getByText("Jean Martin")).toBeInTheDocument();
		expect(screen.getByText("5 avenue Foch")).toBeInTheDocument();
		expect(screen.getByText("75116 Paris")).toBeInTheDocument();
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

	it("shows Modifier billing button before invoice generation", () => {
		render(<OrderAddressCard order={createOrder({ invoiceStatus: "PENDING" })} />);
		expect(
			screen.getByRole("button", { name: /Modifier l'adresse de facturation/i }),
		).toBeInTheDocument();
	});

	it("hides Modifier billing button after invoice generated", () => {
		render(<OrderAddressCard order={createOrder({ invoiceStatus: "GENERATED" })} />);
		expect(screen.queryByRole("button", { name: /Modifier l'adresse de facturation/i })).toBeNull();
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

	it("opens billing edit dialog on Modifier click", () => {
		render(<OrderAddressCard order={createOrder()} />);
		fireEvent.click(screen.getByRole("button", { name: /Modifier l'adresse de facturation/i }));
		expect(mockEditBillingOpen).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				orderNumber: "CMD-001",
				billingSameAsShipping: true,
			}),
		);
	});
});
