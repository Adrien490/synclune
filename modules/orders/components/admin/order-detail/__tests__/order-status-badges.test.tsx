import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock Badge to render children with role, variant and aria-label as-is
vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		role,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		role?: string;
		"aria-label"?: string;
		className?: string;
	}) => (
		<span data-variant={variant} role={role} aria-label={ariaLabel} className={className}>
			{children}
		</span>
	),
}));

// Mock status-display constants with all enum values
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
	PAYMENT_STATUS_LABELS: {
		PENDING: "En attente",
		PAID: "Payée",
		FAILED: "Échouée",
		EXPIRED: "Expirée",
		PARTIALLY_REFUNDED: "Partiellement remboursée",
		REFUNDED: "Remboursée",
	},
	PAYMENT_STATUS_VARIANTS: {
		PENDING: "warning",
		PAID: "success",
		FAILED: "destructive",
		EXPIRED: "secondary",
		PARTIALLY_REFUNDED: "warning",
		REFUNDED: "secondary",
	},
	FULFILLMENT_STATUS_LABELS: {
		UNFULFILLED: "Non traitée",
		PROCESSING: "En préparation",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		RETURNED: "Retournée",
	},
	FULFILLMENT_STATUS_VARIANTS: {
		UNFULFILLED: "outline",
		PROCESSING: "default",
		SHIPPED: "secondary",
		DELIVERED: "success",
		RETURNED: "destructive",
	},
}));

import { OrderStatusBadges } from "../order-status-badges";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

afterEach(cleanup);

/**
 * Build a minimal order object that satisfies OrderStatusBadgesProps.
 * Only status, paymentStatus and fulfillmentStatus are used by the component.
 */
function createOrder(
	status: GetOrderReturn["status"],
	paymentStatus: GetOrderReturn["paymentStatus"],
	fulfillmentStatus: GetOrderReturn["fulfillmentStatus"],
): GetOrderReturn {
	return {
		status,
		paymentStatus,
		fulfillmentStatus,
	} as unknown as GetOrderReturn;
}

describe("OrderStatusBadges", () => {
	describe("group wrapper", () => {
		it("renders a container with role='group'", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING", "UNFULFILLED")} />);
			expect(screen.getByRole("group")).toBeInTheDocument();
		});

		it("sets aria-label on the group wrapper", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING", "UNFULFILLED")} />);
			const group = screen.getByRole("group");
			expect(group.getAttribute("aria-label")).toBe("Statuts de la commande");
		});
	});

	describe("badge count and roles", () => {
		it("renders exactly three badges", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING", "UNFULFILLED")} />);
			expect(screen.getAllByRole("status").length).toBe(3);
		});

		it("each badge has role='status'", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID", "PROCESSING")} />);
			const badges = screen.getAllByRole("status");
			badges.forEach((badge) => {
				expect(badge.getAttribute("role")).toBe("status");
			});
		});
	});

	describe("order status badge", () => {
		it("displays 'En attente' for PENDING order status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING", "UNFULFILLED")} />);
			// Both order status and payment status are PENDING — use aria-label to disambiguate
			expect(
				screen.getByRole("status", { name: "Statut de la commande : En attente" }),
			).toBeInTheDocument();
		});

		it("displays 'En traitement' for PROCESSING order status", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID", "PROCESSING")} />);
			expect(screen.getByText("En traitement")).toBeInTheDocument();
		});

		it("displays 'Expédiée' for SHIPPED order status", () => {
			render(<OrderStatusBadges order={createOrder("SHIPPED", "PAID", "SHIPPED")} />);
			// Use aria-label to target the order status badge specifically
			expect(
				screen.getByRole("status", { name: "Statut de la commande : Expédiée" }),
			).toBeInTheDocument();
		});

		it("displays 'Livrée' for DELIVERED order status", () => {
			render(<OrderStatusBadges order={createOrder("DELIVERED", "PAID", "DELIVERED")} />);
			expect(
				screen.getByRole("status", { name: "Statut de la commande : Livrée" }),
			).toBeInTheDocument();
		});

		it("displays 'Annulée' for CANCELLED order status", () => {
			render(<OrderStatusBadges order={createOrder("CANCELLED", "PENDING", "UNFULFILLED")} />);
			expect(screen.getByText("Annulée")).toBeInTheDocument();
		});

		it("sets aria-label for the order status badge", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING", "UNFULFILLED")} />);
			expect(
				screen.getByRole("status", { name: "Statut de la commande : En attente" }),
			).toBeInTheDocument();
		});
	});

	describe("payment status badge", () => {
		it("displays 'Payée' for PAID payment status", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID", "PROCESSING")} />);
			expect(screen.getByText("Payée")).toBeInTheDocument();
		});

		it("displays 'Échouée' for FAILED payment status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "FAILED", "UNFULFILLED")} />);
			expect(screen.getByText("Échouée")).toBeInTheDocument();
		});

		it("displays 'Expirée' for EXPIRED payment status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "EXPIRED", "UNFULFILLED")} />);
			expect(screen.getByText("Expirée")).toBeInTheDocument();
		});

		it("displays 'Partiellement remboursée' for PARTIALLY_REFUNDED payment status", () => {
			render(
				<OrderStatusBadges order={createOrder("DELIVERED", "PARTIALLY_REFUNDED", "DELIVERED")} />,
			);
			expect(screen.getByText("Partiellement remboursée")).toBeInTheDocument();
		});

		it("displays 'Remboursée' for REFUNDED payment status", () => {
			render(<OrderStatusBadges order={createOrder("DELIVERED", "REFUNDED", "DELIVERED")} />);
			expect(screen.getByText("Remboursée")).toBeInTheDocument();
		});

		it("sets aria-label for the payment status badge", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID", "PROCESSING")} />);
			expect(
				screen.getByRole("status", { name: "Statut du paiement : Payée" }),
			).toBeInTheDocument();
		});
	});

	describe("fulfillment status badge", () => {
		it("displays 'Non traitée' for UNFULFILLED fulfillment status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING", "UNFULFILLED")} />);
			expect(screen.getByText("Non traitée")).toBeInTheDocument();
		});

		it("displays 'En préparation' for PROCESSING fulfillment status", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID", "PROCESSING")} />);
			expect(screen.getByText("En préparation")).toBeInTheDocument();
		});

		it("displays 'Retournée' for RETURNED fulfillment status", () => {
			render(
				<OrderStatusBadges order={createOrder("DELIVERED", "PARTIALLY_REFUNDED", "RETURNED")} />,
			);
			expect(screen.getByText("Retournée")).toBeInTheDocument();
		});

		it("sets aria-label for the fulfillment status badge", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING", "UNFULFILLED")} />);
			expect(
				screen.getByRole("status", { name: "Statut du traitement : Non traitée" }),
			).toBeInTheDocument();
		});
	});

	describe("badge variants", () => {
		it("uses destructive variant for CANCELLED order status", () => {
			render(<OrderStatusBadges order={createOrder("CANCELLED", "PENDING", "UNFULFILLED")} />);
			const badge = screen.getByRole("status", { name: /Statut de la commande : Annulée/ });
			expect(badge.getAttribute("data-variant")).toBe("destructive");
		});

		it("uses success variant for PAID payment status", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID", "PROCESSING")} />);
			const badge = screen.getByRole("status", { name: /Statut du paiement : Payée/ });
			expect(badge.getAttribute("data-variant")).toBe("success");
		});

		it("uses destructive variant for FAILED payment status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "FAILED", "UNFULFILLED")} />);
			const badge = screen.getByRole("status", { name: /Statut du paiement : Échouée/ });
			expect(badge.getAttribute("data-variant")).toBe("destructive");
		});

		it("uses outline variant for UNFULFILLED fulfillment status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING", "UNFULFILLED")} />);
			const badge = screen.getByRole("status", { name: /Statut du traitement : Non traitée/ });
			expect(badge.getAttribute("data-variant")).toBe("outline");
		});

		it("uses success variant for DELIVERED fulfillment status", () => {
			render(<OrderStatusBadges order={createOrder("DELIVERED", "PAID", "DELIVERED")} />);
			const badge = screen.getByRole("status", { name: /Statut du traitement : Livrée/ });
			expect(badge.getAttribute("data-variant")).toBe("success");
		});
	});
});
