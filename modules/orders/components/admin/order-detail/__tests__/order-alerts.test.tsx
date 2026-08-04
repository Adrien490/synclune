import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/app/generated/prisma/browser", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
		CANCELLED: "CANCELLED",
	} as const,
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
		FAILED: "FAILED",
		PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
		REFUNDED: "REFUNDED",
	} as const,
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<div data-testid="alert" data-variant={variant ?? "default"} role="alert">
			{children}
		</div>
	),
	AlertTitle: ({ children }: { children: React.ReactNode }) => (
		<h4 data-testid="alert-title">{children}</h4>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="alert-description">{children}</p>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	WarningIcon: () => <svg data-testid="icon-triangle-alert" />,
	ClockIcon: () => <svg data-testid="icon-clock" />,
	ArrowCounterClockwiseIcon: () => <svg data-testid="icon-rotate-ccw" />,
	XCircleIcon: () => <svg data-testid="icon-circle-x" />,
}));

import { OrderAlerts } from "../order-alerts";

// ============================================================================
// TYPES
// ============================================================================

type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "PARTIALLY_REFUNDED" | "REFUNDED";
type FulfillmentStatus = "UNFULFILLED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "RETURNED";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrderAlerts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders nothing for a normal active order", () => {
		const { container } = render(
			<OrderAlerts status={"PROCESSING" as OrderStatus} paymentStatus={"PAID" as PaymentStatus} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders cancelled alert when status is CANCELLED", () => {
		render(
			<OrderAlerts status={"CANCELLED" as OrderStatus} paymentStatus={"PAID" as PaymentStatus} />,
		);
		expect(screen.getByText("Commande annulée")).toBeInTheDocument();
	});

	it("renders destructive variant for cancelled alert", () => {
		render(
			<OrderAlerts status={"CANCELLED" as OrderStatus} paymentStatus={"PAID" as PaymentStatus} />,
		);
		const alert = screen.getByTestId("alert");
		expect(alert).toHaveAttribute("data-variant", "destructive");
	});

	it("renders payment failed alert when paymentStatus is FAILED", () => {
		render(
			<OrderAlerts
				status={"PROCESSING" as OrderStatus}
				paymentStatus={"FAILED" as PaymentStatus}
			/>,
		);
		expect(screen.getByText("Paiement échoué")).toBeInTheDocument();
	});

	it("renders returned alert when status is RETURNED", () => {
		render(
			<OrderAlerts status={"RETURNED" as OrderStatus} paymentStatus={"PAID" as PaymentStatus} />,
		);
		expect(screen.getByText("Commande retournée")).toBeInTheDocument();
	});

	it("renders multiple alerts simultaneously", () => {
		render(
			<OrderAlerts status={"CANCELLED" as OrderStatus} paymentStatus={"FAILED" as PaymentStatus} />,
		);
		// DEUX alertes, pas trois : « annulée » + « paiement échoué ». La 3ᵉ était
		// « retournée », qui vivait sur l'autre axe — sur un axe unique une commande
		// ne peut plus être CANCELLED et RETURNED à la fois (Lot 4, audit V2).
		const alerts = screen.getAllByTestId("alert");
		expect(alerts.length).toBe(2);
	});

	it("renders CircleX icon for cancelled alert", () => {
		render(
			<OrderAlerts status={"CANCELLED" as OrderStatus} paymentStatus={"PAID" as PaymentStatus} />,
		);
		expect(screen.getByTestId("icon-circle-x")).toBeInTheDocument();
	});

	it("renders TriangleAlert icon for payment failed alert", () => {
		render(
			<OrderAlerts
				status={"PROCESSING" as OrderStatus}
				paymentStatus={"FAILED" as PaymentStatus}
			/>,
		);
		expect(screen.getByTestId("icon-triangle-alert")).toBeInTheDocument();
	});

	it("renders RotateCcw icon for returned alert", () => {
		render(
			<OrderAlerts status={"RETURNED" as OrderStatus} paymentStatus={"PAID" as PaymentStatus} />,
		);
		expect(screen.getByTestId("icon-rotate-ccw")).toBeInTheDocument();
	});
});
