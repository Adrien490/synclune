import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/app/generated/prisma/browser", () => ({
	OrderStatus: {
		PENDING: "PENDING",
		PROCESSING: "PROCESSING",
		SHIPPED: "SHIPPED",
		DELIVERED: "DELIVERED",
		RETURNED: "RETURNED",
		CANCELLED: "CANCELLED",
	},
	PaymentStatus: {
		PENDING: "PENDING",
		PAID: "PAID",
	},
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ClockIcon: () => <svg data-testid="icon-clock" />,
	PackageIcon: () => <svg data-testid="icon-package" />,
	TruckIcon: () => <svg data-testid="icon-truck" />,
	CheckCircleIcon: () => <svg data-testid="icon-circle-check" />,
	XCircleIcon: () => <svg data-testid="icon-circle-x" />,
}));

import { OrderProgressStepper } from "../order-detail/order-progress-stepper";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrderProgressStepper", () => {
	describe("step labels", () => {
		it("renders all 4 step labels", () => {
			render(<OrderProgressStepper status="PENDING" paymentStatus="PAID" />);
			expect(screen.getByText("En attente")).toBeInTheDocument();
			expect(screen.getByText("Préparation")).toBeInTheDocument();
			expect(screen.getByText("Expédiée")).toBeInTheDocument();
			expect(screen.getByText("Livrée")).toBeInTheDocument();
		});
	});

	describe("navigation landmark", () => {
		it("renders navigation with 'Progression de la commande' aria-label", () => {
			render(<OrderProgressStepper status="PENDING" paymentStatus="PAID" />);
			expect(
				screen.getByRole("navigation", { name: "Progression de la commande" }),
			).toBeInTheDocument();
		});
	});

	describe("aria-current step", () => {
		it("marks first step as current when status is PENDING", () => {
			render(<OrderProgressStepper status="PENDING" paymentStatus="PAID" />);
			const steps = screen
				.getAllByRole("listitem")
				.filter((li) => li.getAttribute("aria-current") === "step");
			expect(steps).toHaveLength(1);
			expect(steps[0]).toHaveTextContent("En attente");
		});

		it("marks second step as current when status is PROCESSING", () => {
			render(<OrderProgressStepper status="PROCESSING" paymentStatus="PAID" />);
			const steps = screen
				.getAllByRole("listitem")
				.filter((li) => li.getAttribute("aria-current") === "step");
			expect(steps).toHaveLength(1);
			expect(steps[0]).toHaveTextContent("Préparation");
		});

		it("marks third step as current when status is SHIPPED", () => {
			render(<OrderProgressStepper status="SHIPPED" paymentStatus="PAID" />);
			const steps = screen
				.getAllByRole("listitem")
				.filter((li) => li.getAttribute("aria-current") === "step");
			expect(steps).toHaveLength(1);
			expect(steps[0]).toHaveTextContent("Expédiée");
		});

		it("marks fourth step as current when status is DELIVERED", () => {
			render(<OrderProgressStepper status="DELIVERED" paymentStatus="PAID" />);
			const steps = screen
				.getAllByRole("listitem")
				.filter((li) => li.getAttribute("aria-current") === "step");
			expect(steps).toHaveLength(1);
			expect(steps[0]).toHaveTextContent("Livrée");
		});
	});

	describe("CANCELLED state", () => {
		it("shows 'Commande annulée' badge when status is CANCELLED", () => {
			render(<OrderProgressStepper status="CANCELLED" paymentStatus="PAID" />);
			expect(screen.getByTestId("badge")).toBeInTheDocument();
			expect(screen.getByText("Commande annulée")).toBeInTheDocument();
		});

		it("renders no aria-current step when status is CANCELLED", () => {
			render(<OrderProgressStepper status="CANCELLED" paymentStatus="PAID" />);
			const currentSteps = screen
				.getAllByRole("listitem")
				.filter((li) => li.getAttribute("aria-current") === "step");
			expect(currentSteps).toHaveLength(0);
		});
	});
});
