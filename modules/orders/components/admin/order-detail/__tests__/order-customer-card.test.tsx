import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockEditOpen, mockHaptic } = vi.hoisted(() => ({
	mockEditOpen: vi.fn(),
	mockHaptic: vi.fn(),
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

vi.mock("lucide-react", () => ({
	Phone: () => <svg aria-hidden="true" />,
	User: () => <svg aria-hidden="true" />,
	ExternalLink: () => <svg aria-hidden="true" />,
	Pencil: () => <svg aria-hidden="true" />,
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

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
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
		customerPhone: null,
		userId: "user-1",
		invoiceStatus: "PENDING",
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

	it("shows Client non enregistré when userId is null", () => {
		render(<OrderCustomerCard order={createOrder({ userId: null })} />);
		expect(screen.getByText("Client non enregistré")).toBeInTheDocument();
	});

	it("does not show Client non enregistré when userId is set", () => {
		render(<OrderCustomerCard order={createOrder({ userId: "user-42" })} />);
		expect(screen.queryByText("Client non enregistré")).toBeNull();
	});

	it("shows phone when customerPhone is present", () => {
		render(<OrderCustomerCard order={createOrder({ customerPhone: "+33612345678" })} />);
		expect(screen.getByText("+33612345678")).toBeInTheDocument();
	});

	it("hides phone section when customerPhone is null", () => {
		render(<OrderCustomerCard order={createOrder({ customerPhone: null })} />);
		expect(screen.queryByText(/\+336/)).toBeNull();
	});

	it("shows Modifier button when invoiceStatus is not GENERATED", () => {
		render(<OrderCustomerCard order={createOrder({ invoiceStatus: "PENDING" })} />);
		expect(screen.getByRole("button", { name: /Modifier/i })).toBeInTheDocument();
	});

	it("hides Modifier button when invoice is GENERATED", () => {
		render(<OrderCustomerCard order={createOrder({ invoiceStatus: "GENERATED" })} />);
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
