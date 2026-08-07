import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockEditOpen, mockHaptic, mockPush } = vi.hoisted(() => ({
	mockEditOpen: vi.fn(),
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
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	PhoneIcon: () => <svg aria-hidden="true" />,
	UserIcon: () => <svg aria-hidden="true" />,
	ArrowSquareOutIcon: () => <svg aria-hidden="true" />,
	PencilSimpleIcon: () => <svg aria-hidden="true" />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	InvoiceStatus: {
		PENDING: "PENDING",
		GENERATED: "GENERATED",
	},
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => ({ open: mockEditOpen, close: vi.fn(), isOpen: false, data: null }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("../../edit-customer-info-dialog", () => ({
	EDIT_CUSTOMER_INFO_DIALOG_ID: "edit-customer-info",
}));

import { OrderCustomerCard } from "../order-customer-card";

afterEach(() => {
	cleanup();
	mockEditOpen.mockReset();
	mockHaptic.mockReset();
});

function createOrder(overrides = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		customerName: "Marie Dupont",
		customerEmail: "marie@example.com",
		// Gate sur invoiceNumber (P1-B audit 2026-08-01) : null = pas de facture
		// émise → éditable. VOIDED conserve son numéro, donc reste verrouillé.
		invoiceNumber: null,
		invoiceStatus: null,
		...overrides,
	} as any;
}

describe("OrderCustomerCard", () => {
	it("renders title Client", () => {
		render(<OrderCustomerCard order={createOrder()} />);
		expect(screen.getByText("Client")).toBeInTheDocument();
	});

	it("shows customer name", () => {
		render(<OrderCustomerCard order={createOrder({ customerName: "Jean Martin" })} />);
		expect(screen.getByText("Jean Martin")).toBeInTheDocument();
	});

	it("shows customer email", () => {
		render(<OrderCustomerCard order={createOrder({ customerEmail: "jean@example.com" })} />);
		expect(screen.getByText("jean@example.com")).toBeInTheDocument();
	});

	/**
	 * La carte distinguait « client enregistré » (nom cliquable vers `/admin/clients`)
	 * de « Client non enregistré » (texte nu). La distinction a disparu avec l'espace
	 * client (2026-07-31) : toute commande est un achat invité, et ce que l'admin lit
	 * ici est le SNAPSHOT figé sur la commande (invariant #5), pas un profil vivant.
	 *
	 * Le rendu est donc identique quel que soit `userId` — y compris sur une commande
	 * héritée qui en porte encore un.
	 */
	it("rend le nom en texte nu, sans lien de fiche client, quel que soit userId", () => {
		for (const userId of [null, "user-42"]) {
			const { unmount } = render(
				<OrderCustomerCard order={createOrder({ userId, customerName: "Marie Dupont" })} />,
			);

			expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
			expect(screen.queryByRole("link")).toBeNull();
			expect(screen.queryByText("Client non enregistré")).toBeNull();

			unmount();
		}
	});

	// @regression order-single-phone (2026-08-04) : `Order.customerPhone` est
	// partie — le téléphone du client vit dans `shippingPhone` et s'affiche dans
	// la carte « Livraison ». Cette carte ne doit plus prétendre en porter un.
	it("n'affiche plus de téléphone", () => {
		render(<OrderCustomerCard order={createOrder()} />);
		expect(screen.queryByText(/\+336/)).toBeNull();
	});

	it("shows Modifier button when no invoice has been issued", () => {
		render(<OrderCustomerCard order={createOrder({ invoiceNumber: null })} />);
		expect(screen.getByRole("button", { name: /Modifier/i })).toBeInTheDocument();
	});

	it("hides Modifier button when invoice is GENERATED", () => {
		render(
			<OrderCustomerCard
				order={createOrder({ invoiceNumber: "F-2026-00042", invoiceStatus: "GENERATED" })}
			/>,
		);
		expect(screen.queryByRole("button", { name: /Modifier/i })).toBeNull();
	});

	// @regression invoice-issued-lock (P1-B audit 2026-08-01) : voidInvoice
	// conserve invoiceNumber — l'identité client reste verrouillée après void
	// (l'avoir est rendu depuis les colonnes vivantes, Art. 272-I / L102 B).
	it("hides Modifier button when invoice is VOIDED (invoiceNumber conservé)", () => {
		render(
			<OrderCustomerCard
				order={createOrder({ invoiceNumber: "F-2026-00042", invoiceStatus: "VOIDED" })}
			/>,
		);
		expect(screen.queryByRole("button", { name: /Modifier/i })).toBeNull();
	});

	it("opens edit dialog with customer payload on Modifier click", () => {
		render(<OrderCustomerCard order={createOrder()} />);
		fireEvent.click(screen.getByRole("button", { name: /Modifier/i }));
		expect(mockEditOpen).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				orderNumber: "CMD-001",
				customerEmail: "marie@example.com",
				customerName: "Marie Dupont",
			}),
		);
		expect(mockHaptic).toHaveBeenCalledWith("light");
	});
});
