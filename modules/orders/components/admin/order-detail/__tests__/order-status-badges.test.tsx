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
	// Miroir de la SSOT fusionnée (Lot 4) : `RETURNED` y est une valeur d'OrderStatus,
	// et `PROCESSING` porte « En préparation » (ex-libellé fulfillment).
	ORDER_STATUS_LABELS: {
		PENDING: "En attente",
		PROCESSING: "En préparation",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		RETURNED: "Retournée",
		CANCELLED: "Annulée",
	},
	ORDER_STATUS_VARIANTS: {
		PENDING: "warning",
		PROCESSING: "default",
		SHIPPED: "secondary",
		DELIVERED: "success",
		RETURNED: "destructive",
		CANCELLED: "destructive",
	},
	PAYMENT_STATUS_LABELS: {
		PENDING: "En attente",
		PAID: "Payée",
		FAILED: "Échouée",
		PARTIALLY_REFUNDED: "Partiellement remboursée",
		REFUNDED: "Remboursée",
	},
	PAYMENT_STATUS_VARIANTS: {
		PENDING: "warning",
		PAID: "success",
		FAILED: "destructive",
		PARTIALLY_REFUNDED: "warning",
		REFUNDED: "secondary",
	},
}));

import { OrderStatusBadges } from "../order-status-badges";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

afterEach(cleanup);

/**
 * Build a minimal order object that satisfies OrderStatusBadgesProps.
 * Only status and paymentStatus are used by the component (le badge de traitement
 * a fusionné dans celui de statut — audit V2, Lot 4).
 */
function createOrder(
	status: GetOrderReturn["status"],
	paymentStatus: GetOrderReturn["paymentStatus"],
): GetOrderReturn {
	return {
		status,
		paymentStatus,
	} as unknown as GetOrderReturn;
}

describe("OrderStatusBadges", () => {
	describe("group wrapper", () => {
		it("renders a container with role='group'", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING")} />);
			expect(screen.getByRole("group")).toBeInTheDocument();
		});

		it("sets aria-label on the group wrapper", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING")} />);
			const group = screen.getByRole("group");
			expect(group.getAttribute("aria-label")).toBe("Statuts de la commande");
		});
	});

	describe("badge count and roles", () => {
		// DEUX badges depuis le Lot 4 (audit V2) : statut + paiement. Le 3ᵉ, « statut
		// de traitement », affichait le même avancement que le premier sur un autre
		// axe — c'est cette duplication à l'écran qui a motivé la fusion.
		it("renders exactly two badges", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING")} />);
			expect(screen.getAllByRole("status").length).toBe(2);
		});

		it("each badge has role='status'", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID")} />);
			const badges = screen.getAllByRole("status");
			badges.forEach((badge) => {
				expect(badge.getAttribute("role")).toBe("status");
			});
		});
	});

	describe("order status badge", () => {
		it("displays 'En attente' for PENDING order status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING")} />);
			// Both order status and payment status are PENDING — use aria-label to disambiguate
			expect(
				screen.getByRole("status", { name: "Statut de la commande : En attente" }),
			).toBeInTheDocument();
		});

		it("displays 'En préparation' for PROCESSING order status", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID")} />);
			expect(screen.getByText("En préparation")).toBeInTheDocument();
		});

		it("displays 'Expédiée' for SHIPPED order status", () => {
			render(<OrderStatusBadges order={createOrder("SHIPPED", "PAID")} />);
			// Use aria-label to target the order status badge specifically
			expect(
				screen.getByRole("status", { name: "Statut de la commande : Expédiée" }),
			).toBeInTheDocument();
		});

		it("displays 'Livrée' for DELIVERED order status", () => {
			render(<OrderStatusBadges order={createOrder("DELIVERED", "PAID")} />);
			expect(
				screen.getByRole("status", { name: "Statut de la commande : Livrée" }),
			).toBeInTheDocument();
		});

		it("displays 'Annulée' for CANCELLED order status", () => {
			render(<OrderStatusBadges order={createOrder("CANCELLED", "PENDING")} />);
			expect(screen.getByText("Annulée")).toBeInTheDocument();
		});

		it("sets aria-label for the order status badge", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "PENDING")} />);
			expect(
				screen.getByRole("status", { name: "Statut de la commande : En attente" }),
			).toBeInTheDocument();
		});
	});

	describe("payment status badge", () => {
		it("displays 'Payée' for PAID payment status", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID")} />);
			expect(screen.getByText("Payée")).toBeInTheDocument();
		});

		it("displays 'Échouée' for FAILED payment status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "FAILED")} />);
			expect(screen.getByText("Échouée")).toBeInTheDocument();
		});

		it("displays 'Partiellement remboursée' for PARTIALLY_REFUNDED payment status", () => {
			render(<OrderStatusBadges order={createOrder("DELIVERED", "PARTIALLY_REFUNDED")} />);
			expect(screen.getByText("Partiellement remboursée")).toBeInTheDocument();
		});

		it("displays 'Remboursée' for REFUNDED payment status", () => {
			render(<OrderStatusBadges order={createOrder("DELIVERED", "REFUNDED")} />);
			expect(screen.getByText("Remboursée")).toBeInTheDocument();
		});

		it("sets aria-label for the payment status badge", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID")} />);
			expect(
				screen.getByRole("status", { name: "Statut du paiement : Payée" }),
			).toBeInTheDocument();
		});
	});

	// Le describe « fulfillment status badge » a disparu avec le badge lui-même
	// (Lot 4). Les libellés qu'il vérifiait sont désormais portés par le badge de
	// statut ci-dessus — `RETURNED` inclus, qui est une valeur d'`OrderStatus`.
	describe("statut retourné", () => {
		it("affiche « Retournée » sur le badge de statut", () => {
			render(<OrderStatusBadges order={createOrder("RETURNED", "PARTIALLY_REFUNDED")} />);
			expect(screen.getByText("Retournée")).toBeInTheDocument();
		});
	});

	describe("badge variants", () => {
		it("uses destructive variant for CANCELLED order status", () => {
			render(<OrderStatusBadges order={createOrder("CANCELLED", "PENDING")} />);
			const badge = screen.getByRole("status", { name: /Statut de la commande : Annulée/ });
			expect(badge.getAttribute("data-variant")).toBe("destructive");
		});

		it("uses success variant for PAID payment status", () => {
			render(<OrderStatusBadges order={createOrder("PROCESSING", "PAID")} />);
			const badge = screen.getByRole("status", { name: /Statut du paiement : Payée/ });
			expect(badge.getAttribute("data-variant")).toBe("success");
		});

		it("uses destructive variant for FAILED payment status", () => {
			render(<OrderStatusBadges order={createOrder("PENDING", "FAILED")} />);
			const badge = screen.getByRole("status", { name: /Statut du paiement : Échouée/ });
			expect(badge.getAttribute("data-variant")).toBe("destructive");
		});

		it("uses success variant for DELIVERED order status", () => {
			render(<OrderStatusBadges order={createOrder("DELIVERED", "PAID")} />);
			const badge = screen.getByRole("status", { name: /Statut de la commande : Livrée/ });
			expect(badge.getAttribute("data-variant")).toBe("success");
		});
	});
});
