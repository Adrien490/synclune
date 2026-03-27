import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, asChild, ...props }: any) => {
		if (asChild) return <div {...props}>{children}</div>;
		return (
			<button onClick={onClick} {...props}>
				{children}
			</button>
		);
	},
}));

vi.mock("lucide-react", () => ({
	Truck: () => <svg aria-hidden="true" />,
	ExternalLink: () => <svg aria-hidden="true" />,
}));

vi.mock("date-fns", () => ({
	format: () => "15 mars 2026 à 10h30",
}));
vi.mock("date-fns/locale", () => ({ fr: {} }));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ label }: any) => <button aria-label={`Copier ${label}`} />,
}));

vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getCarrierLabel: (carrier: string) => {
		const labels: Record<string, string> = {
			colissimo: "Colissimo",
			chronopost: "Chronopost",
		};
		return labels[carrier] ?? "Autre transporteur";
	},
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false, data: null }),
}));

vi.mock("@/modules/orders/components/admin/update-tracking-dialog", () => ({
	UPDATE_TRACKING_DIALOG_ID: "update-tracking",
}));

import { OrderShippingCard } from "../order-shipping-card";

afterEach(cleanup);

function createOrder(overrides = {}) {
	return {
		id: "order-1",
		orderNumber: "CMD-001",
		trackingNumber: null,
		trackingUrl: null,
		shippingCarrier: null,
		shippedAt: null,
		...overrides,
	} as any;
}

describe("OrderShippingCard", () => {
	it("renders title Expédition", () => {
		render(<OrderShippingCard order={createOrder()} canUpdateTracking={false} />);
		expect(screen.getByText("Expédition")).toBeInTheDocument();
	});

	it("shows tracking number when present", () => {
		render(
			<OrderShippingCard
				order={createOrder({ trackingNumber: "1Z999AA10123456784" })}
				canUpdateTracking={false}
			/>,
		);
		expect(screen.getByText("1Z999AA10123456784")).toBeInTheDocument();
	});

	it("shows carrier label when shippingCarrier is set", () => {
		render(
			<OrderShippingCard
				order={createOrder({ trackingNumber: "ABC123", shippingCarrier: "colissimo" })}
				canUpdateTracking={false}
			/>,
		);
		expect(screen.getByText("Colissimo")).toBeInTheDocument();
	});

	it("shows Modifier button when canUpdateTracking is true", () => {
		render(<OrderShippingCard order={createOrder()} canUpdateTracking={true} />);
		expect(screen.getByText("Modifier")).toBeInTheDocument();
	});

	it("hides Modifier button when canUpdateTracking is false", () => {
		render(<OrderShippingCard order={createOrder()} canUpdateTracking={false} />);
		expect(screen.queryByText("Modifier")).toBeNull();
	});

	it("shows Suivre link when trackingUrl exists", () => {
		render(
			<OrderShippingCard
				order={createOrder({
					trackingNumber: "ABC123",
					trackingUrl: "https://track.example.com/ABC123",
				})}
				canUpdateTracking={false}
			/>,
		);
		expect(screen.getByText("Suivre")).toBeInTheDocument();
	});

	it("hides Suivre link when trackingUrl is null", () => {
		render(
			<OrderShippingCard
				order={createOrder({ trackingNumber: "ABC123", trackingUrl: null })}
				canUpdateTracking={false}
			/>,
		);
		expect(screen.queryByText("Suivre")).toBeNull();
	});

	it("shows shipped date when shippedAt is set", () => {
		render(
			<OrderShippingCard
				order={createOrder({ shippedAt: new Date("2026-03-15T10:30:00Z") })}
				canUpdateTracking={false}
			/>,
		);
		expect(screen.getByText("Date d'expédition")).toBeInTheDocument();
		expect(screen.getByText("15 mars 2026 à 10h30")).toBeInTheDocument();
	});

	it("hides shipped date section when shippedAt is null", () => {
		render(
			<OrderShippingCard order={createOrder({ shippedAt: null })} canUpdateTracking={false} />,
		);
		expect(screen.queryByText("Date d'expédition")).toBeNull();
	});
});
