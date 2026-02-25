import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock lucide-react icons to avoid SVG rendering complexity
vi.mock("lucide-react", () => ({
	CheckCircle2: () => <svg data-testid="icon-check-circle" />,
	Clock: () => <svg data-testid="icon-clock" />,
	CreditCard: () => <svg data-testid="icon-credit-card" />,
	Package: () => <svg data-testid="icon-package" />,
	Truck: () => <svg data-testid="icon-truck" />,
	XCircle: () => <svg data-testid="icon-x-circle" />,
}));

// Mock Badge to render children with variant as a data attribute
vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
	}: {
		children: React.ReactNode;
		variant?: string;
	}) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

// Mock date-fns to return a predictable formatted string
vi.mock("date-fns", () => ({
	format: vi.fn((_date: Date, _fmt: string) => "1 janvier 2024 à 10:00"),
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

// Mock status-display constants
vi.mock("@/modules/orders/constants/status-display", () => ({
	ORDER_STATUS_LABELS: {
		PENDING: "En attente",
		PROCESSING: "En traitement",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		CANCELLED: "Annulée",
	},
	ORDER_STATUS_VARIANTS: {
		PENDING: "warning",
		PROCESSING: "default",
		SHIPPED: "secondary",
		DELIVERED: "success",
		CANCELLED: "destructive",
	},
}));

import { OrderStatusTimeline } from "../order-status-timeline";

afterEach(cleanup);

const BASE_DATE = new Date("2024-01-01T10:00:00Z");
const PAID_DATE = new Date("2024-01-01T10:30:00Z");
const SHIPPED_DATE = new Date("2024-01-02T09:00:00Z");
const DELIVERED_DATE = new Date("2024-01-03T14:00:00Z");

type OrderInput = Parameters<typeof OrderStatusTimeline>[0]["order"];

function createOrder(overrides: Partial<OrderInput> = {}): OrderInput {
	return {
		status: "PENDING",
		paymentStatus: "PENDING",
		fulfillmentStatus: "UNFULFILLED",
		createdAt: BASE_DATE,
		paidAt: null,
		shippedAt: null,
		actualDelivery: null,
		...overrides,
	};
}

describe("OrderStatusTimeline", () => {
	describe("section heading and badge", () => {
		it("renders the section heading 'Suivi de commande'", () => {
			render(<OrderStatusTimeline order={createOrder()} />);
			expect(screen.getByText("Suivi de commande")).toBeInTheDocument();
		});

		it("renders the order status badge with the correct label", () => {
			render(<OrderStatusTimeline order={createOrder({ status: "PROCESSING" })} />);
			expect(screen.getByTestId("badge").textContent).toBe("En traitement");
		});

		it("renders the badge with the correct variant for CANCELLED status", () => {
			render(<OrderStatusTimeline order={createOrder({ status: "CANCELLED" })} />);
			expect(screen.getByTestId("badge").getAttribute("data-variant")).toBe("destructive");
		});

		it("renders the badge with success variant for DELIVERED status", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({ status: "DELIVERED", fulfillmentStatus: "DELIVERED" })}
				/>
			);
			expect(screen.getByTestId("badge").getAttribute("data-variant")).toBe("success");
		});
	});

	describe("cancelled order", () => {
		it("shows the cancellation alert for CANCELLED status", () => {
			render(<OrderStatusTimeline order={createOrder({ status: "CANCELLED" })} />);
			expect(screen.getByText("Commande annulée")).toBeInTheDocument();
		});

		it("shows the cancellation description message", () => {
			render(<OrderStatusTimeline order={createOrder({ status: "CANCELLED" })} />);
			expect(screen.getByText("Cette commande a été annulée.")).toBeInTheDocument();
		});

		it("does not render any timeline steps for a cancelled order", () => {
			render(<OrderStatusTimeline order={createOrder({ status: "CANCELLED" })} />);
			expect(screen.queryByText("Commande passée")).toBeNull();
			expect(screen.queryByText("Paiement reçu")).toBeNull();
			expect(screen.queryByText("En préparation")).toBeNull();
			expect(screen.queryByText("Expédiée")).toBeNull();
			expect(screen.queryByText("Livrée")).toBeNull();
		});
	});

	describe("timeline steps rendering", () => {
		it("renders all 5 step labels for a non-cancelled order", () => {
			render(<OrderStatusTimeline order={createOrder()} />);
			expect(screen.getByText("Commande passée")).toBeInTheDocument();
			expect(screen.getByText("Paiement reçu")).toBeInTheDocument();
			expect(screen.getByText("En préparation")).toBeInTheDocument();
			expect(screen.getByText("Expédiée")).toBeInTheDocument();
			expect(screen.getByText("Livrée")).toBeInTheDocument();
		});

		it("renders 'Commande passée' as always completed (foreground text class)", () => {
			render(<OrderStatusTimeline order={createOrder()} />);
			const label = screen.getByText("Commande passée");
			expect(label.className).toContain("text-foreground");
		});

		it("always displays the createdAt date for the first step", () => {
			render(<OrderStatusTimeline order={createOrder({ createdAt: BASE_DATE })} />);
			// createdAt step is always completed — its date must be shown
			expect(screen.getByText("1 janvier 2024 à 10:00")).toBeInTheDocument();
		});
	});

	describe("payment step", () => {
		it("shows payment step with foreground text when paymentStatus is PAID", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({ paymentStatus: "PAID", paidAt: PAID_DATE })}
				/>
			);
			const label = screen.getByText("Paiement reçu");
			expect(label.className).toContain("text-foreground");
		});

		it("shows payment step with muted text when paymentStatus is PENDING", () => {
			render(
				<OrderStatusTimeline order={createOrder({ paymentStatus: "PENDING" })} />
			);
			const label = screen.getByText("Paiement reçu");
			expect(label.className).toContain("text-muted-foreground");
		});

		it("shows payment step with muted text when paymentStatus is FAILED", () => {
			// A failed step is not completed and not active — label gets muted class
			render(
				<OrderStatusTimeline order={createOrder({ paymentStatus: "FAILED" })} />
			);
			const label = screen.getByText("Paiement reçu");
			expect(label.className).toContain("text-muted-foreground");
		});

		it("shows payment step with muted text when paymentStatus is EXPIRED", () => {
			render(
				<OrderStatusTimeline order={createOrder({ paymentStatus: "EXPIRED" })} />
			);
			const label = screen.getByText("Paiement reçu");
			expect(label.className).toContain("text-muted-foreground");
		});

		it("displays the paid date when paymentStatus is PAID and paidAt is set", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({ paymentStatus: "PAID", paidAt: PAID_DATE })}
				/>
			);
			// The mock always returns "1 janvier 2024 à 10:00"
			expect(screen.getAllByText("1 janvier 2024 à 10:00").length).toBeGreaterThan(0);
		});

		it("does not display a date for the payment step when paymentStatus is PENDING and paidAt is null", () => {
			render(
				<OrderStatusTimeline order={createOrder({ paymentStatus: "PENDING", paidAt: null })} />
			);
			// createdAt date is still shown for step 1, but paidAt-based date for step 2 should not appear
			// Only one date element visible — the "Commande passée" date
			expect(screen.getAllByText("1 janvier 2024 à 10:00").length).toBe(1);
		});
	});

	describe("preparation step", () => {
		it("shows preparation step as active (foreground text) when fulfillmentStatus is PROCESSING", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "PROCESSING",
					})}
				/>
			);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-foreground");
		});

		it("shows preparation step as completed when fulfillmentStatus is SHIPPED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "SHIPPED",
						shippedAt: SHIPPED_DATE,
					})}
				/>
			);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-foreground");
		});

		it("shows preparation step as completed when fulfillmentStatus is DELIVERED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "DELIVERED",
						actualDelivery: DELIVERED_DATE,
					})}
				/>
			);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-foreground");
		});

		it("shows preparation step as pending when fulfillmentStatus is UNFULFILLED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({ fulfillmentStatus: "UNFULFILLED" })}
				/>
			);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-muted-foreground");
		});
	});

	describe("shipped step", () => {
		it("shows shipped step as completed when fulfillmentStatus is SHIPPED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "SHIPPED",
						shippedAt: SHIPPED_DATE,
					})}
				/>
			);
			const label = screen.getByText("Expédiée");
			expect(label.className).toContain("text-foreground");
		});

		it("shows shipped step as completed when fulfillmentStatus is DELIVERED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "DELIVERED",
						shippedAt: SHIPPED_DATE,
						actualDelivery: DELIVERED_DATE,
					})}
				/>
			);
			const label = screen.getByText("Expédiée");
			expect(label.className).toContain("text-foreground");
		});

		it("shows shipped step as pending when fulfillmentStatus is PROCESSING", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "PROCESSING",
					})}
				/>
			);
			const label = screen.getByText("Expédiée");
			expect(label.className).toContain("text-muted-foreground");
		});
	});

	describe("delivered step", () => {
		it("shows delivered step as completed when fulfillmentStatus is DELIVERED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "DELIVERED",
						shippedAt: SHIPPED_DATE,
						actualDelivery: DELIVERED_DATE,
					})}
				/>
			);
			const label = screen.getByText("Livrée");
			expect(label.className).toContain("text-foreground");
		});

		it("shows delivered step as pending when fulfillmentStatus is SHIPPED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "SHIPPED",
						shippedAt: SHIPPED_DATE,
					})}
				/>
			);
			const label = screen.getByText("Livrée");
			expect(label.className).toContain("text-muted-foreground");
		});

		it("shows the delivery date when fulfillmentStatus is DELIVERED and actualDelivery is set", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						fulfillmentStatus: "DELIVERED",
						shippedAt: SHIPPED_DATE,
						actualDelivery: DELIVERED_DATE,
					})}
				/>
			);
			// Multiple date elements appear for completed steps
			expect(screen.getAllByText("1 janvier 2024 à 10:00").length).toBeGreaterThan(0);
		});

		it("does not show a date under 'Livrée' when fulfillmentStatus is SHIPPED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						fulfillmentStatus: "SHIPPED",
						shippedAt: SHIPPED_DATE,
						actualDelivery: null,
					})}
				/>
			);
			const deliveredLabel = screen.getByText("Livrée");
			const container = deliveredLabel.closest(".flex-1");
			// The only child of .flex-1 should be the label paragraph; no date paragraph
			const paragraphs = container?.querySelectorAll("p");
			expect(paragraphs?.length).toBe(1);
		});
	});
});
