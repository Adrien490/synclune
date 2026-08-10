import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock des icônes Phosphor pour éviter la complexité du rendu SVG
vi.mock("@phosphor-icons/react/ssr", () => ({
	CheckCircleIcon: () => <svg data-testid="icon-check-circle" />,
	ClockIcon: () => <svg data-testid="icon-clock" />,
	CreditCardIcon: () => <svg data-testid="icon-credit-card" />,
	PackageIcon: () => <svg data-testid="icon-package" />,
	TruckIcon: () => <svg data-testid="icon-truck" />,
	XCircleIcon: () => <svg data-testid="icon-x-circle" />,
	ArrowUUpLeftIcon: () => <svg data-testid="icon-undo" />,
}));

// Mock Badge to render children with variant as a data attribute
vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
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

/**
 * Libellé d'une étape de la timeline.
 *
 * Un seul axe depuis le Lot 4 (audit V2) : les fixtures ne posent plus qu'un `status`
 * cohérentes : le badge d'en-tête rend `ORDER_STATUS_LABELS[status]`, qui collide
 * avec le libellé de l'étape correspondante (« Expédiée », « Livrée »). Le badge
 * est un `<span>`, les étapes des `<p>`.
 */
function stepLabel(label: string): HTMLElement {
	const match = screen.getAllByText(label).find((el) => el.tagName === "P");
	if (!match) throw new Error(`Étape « ${label} » introuvable dans la timeline`);
	return match;
}

function createOrder(overrides: Partial<OrderInput> = {}): OrderInput {
	return {
		status: "PENDING",
		paymentStatus: "PENDING",
		createdAt: BASE_DATE,
		paidAt: null,
		shippedAt: null,
		deliveredAt: null,
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
			render(<OrderStatusTimeline order={createOrder({ status: "DELIVERED" })} />);
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
				<OrderStatusTimeline order={createOrder({ paymentStatus: "PAID", paidAt: PAID_DATE })} />,
			);
			const label = screen.getByText("Paiement reçu");
			expect(label.className).toContain("text-foreground");
		});

		it("shows payment step with muted text when paymentStatus is PENDING", () => {
			render(<OrderStatusTimeline order={createOrder({ paymentStatus: "PENDING" })} />);
			const label = screen.getByText("Paiement reçu");
			expect(label.className).toContain("text-muted-foreground");
		});

		it("shows payment step with muted text when paymentStatus is FAILED", () => {
			// A failed step is not completed and not active — label gets muted class
			render(<OrderStatusTimeline order={createOrder({ paymentStatus: "FAILED" })} />);
			const label = screen.getByText("Paiement reçu");
			expect(label.className).toContain("text-muted-foreground");
		});

		it("displays the paid date when paymentStatus is PAID and paidAt is set", () => {
			render(
				<OrderStatusTimeline order={createOrder({ paymentStatus: "PAID", paidAt: PAID_DATE })} />,
			);
			// The mock always returns "1 janvier 2024 à 10:00"
			expect(screen.getAllByText("1 janvier 2024 à 10:00").length).toBeGreaterThan(0);
		});

		it("does not display a date for the payment step when paymentStatus is PENDING and paidAt is null", () => {
			render(
				<OrderStatusTimeline order={createOrder({ paymentStatus: "PENDING", paidAt: null })} />,
			);
			// createdAt date is still shown for step 1, but paidAt-based date for step 2 should not appear
			// Only one date element visible — the "Commande passée" date
			expect(screen.getAllByText("1 janvier 2024 à 10:00").length).toBe(1);
		});
	});

	// ⚠️ Un seul axe depuis le Lot 4 : les fixtures ne posent plus qu'un `status`
	// COHÉRENTES, telles que la production les produit. Les anciennes ne
	// renseignaient que `status`, produisant des états impossibles
	// (`status: PENDING` + `status: DELIVERED`) — c'est ce qui rendait
	// invisible le fait que la timeline ignorait `status`.
	describe("preparation step", () => {
		// Le cas le plus important : l'état réel de toute commande fraîchement
		// payée. Le webhook pose `status = PROCESSING` et laisse
		// `status = UNFULFILLED`. Avant correction, l'étape restait
		// grise pour 100 % des clientes ayant payé.
		it("est active sur une commande payée dont le fulfillment est resté UNFULFILLED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "PROCESSING",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
					})}
				/>,
			);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-foreground");
		});

		it("shows preparation step as active when status is PROCESSING", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "PROCESSING",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
					})}
				/>,
			);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-foreground");
		});

		it("shows preparation step as completed when status is SHIPPED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "SHIPPED",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						shippedAt: SHIPPED_DATE,
					})}
				/>,
			);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-foreground");
		});

		it("shows preparation step as completed when status is DELIVERED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "DELIVERED",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						deliveredAt: DELIVERED_DATE,
					})}
				/>,
			);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-foreground");
		});

		it("shows preparation step as pending on an unpaid order", () => {
			render(<OrderStatusTimeline order={createOrder({ status: "PENDING" })} />);
			const label = screen.getByText("En préparation");
			expect(label.className).toContain("text-muted-foreground");
		});

		// Pas de date : réutiliser `paidAt` affichait l'horodatage du paiement
		// deux étapes de suite, sous un libellé qui ne le désigne pas.
		it("n'affiche pas de date sous « En préparation »", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "PROCESSING",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
					})}
				/>,
			);
			const container = screen.getByText("En préparation").closest(".flex-1");
			expect(container?.querySelectorAll("p").length).toBe(1);
		});
	});

	describe("shipped step", () => {
		it("shows shipped step as completed when status is SHIPPED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "SHIPPED",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						shippedAt: SHIPPED_DATE,
					})}
				/>,
			);
			const label = stepLabel("Expédiée");
			expect(label.className).toContain("text-foreground");
		});

		it("shows shipped step as completed when status is DELIVERED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "DELIVERED",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						shippedAt: SHIPPED_DATE,
						deliveredAt: DELIVERED_DATE,
					})}
				/>,
			);
			const label = stepLabel("Expédiée");
			expect(label.className).toContain("text-foreground");
		});

		it("shows shipped step as pending when status is PROCESSING", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "PROCESSING",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
					})}
				/>,
			);
			const label = stepLabel("Expédiée");
			expect(label.className).toContain("text-muted-foreground");
		});
	});

	describe("delivered step", () => {
		it("shows delivered step as completed when status is DELIVERED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "DELIVERED",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						shippedAt: SHIPPED_DATE,
						deliveredAt: DELIVERED_DATE,
					})}
				/>,
			);
			const label = stepLabel("Livrée");
			expect(label.className).toContain("text-foreground");
		});

		it("shows delivered step as pending when status is SHIPPED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "SHIPPED",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						shippedAt: SHIPPED_DATE,
					})}
				/>,
			);
			const label = stepLabel("Livrée");
			expect(label.className).toContain("text-muted-foreground");
		});

		it("shows the delivery date when status is DELIVERED and deliveredAt is set", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "DELIVERED",
						paymentStatus: "PAID",
						paidAt: PAID_DATE,
						shippedAt: SHIPPED_DATE,
						deliveredAt: DELIVERED_DATE,
					})}
				/>,
			);
			// Multiple date elements appear for completed steps
			expect(screen.getAllByText("1 janvier 2024 à 10:00").length).toBeGreaterThan(0);
		});

		it("does not show a date under 'Livrée' when status is SHIPPED", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "SHIPPED",
						shippedAt: SHIPPED_DATE,
						deliveredAt: null,
					})}
				/>,
			);
			const deliveredLabel = stepLabel("Livrée");
			const container = deliveredLabel.closest(".flex-1");
			// The only child of .flex-1 should be the label paragraph; no date paragraph
			const paragraphs = container?.querySelectorAll("p");
			expect(paragraphs?.length).toBe(1);
		});
	});

	// `markAsReturned` pose `status = RETURNED`. Historiquement le retour vivait sur
	// `fulfillmentStatus` en laissant `status = DELIVERED`, et aucune branche ne
	// traitait cette valeur : le badge affichait « Livrée » pendant que les trois
	// étapes régressaient toutes en gris, sans mention du retour. Depuis la fusion
	// des axes (Lot 4), le retour est une valeur d'`OrderStatus` à part entière.
	describe("returned order", () => {
		function returnedOrder() {
			return createOrder({
				// Ex-paire (DELIVERED, RETURNED) : axe unique depuis le Lot 4.
				status: "RETURNED",
				paymentStatus: "PAID",
				paidAt: PAID_DATE,
				shippedAt: SHIPPED_DATE,
				deliveredAt: DELIVERED_DATE,
			});
		}

		it("affiche une étape « Retournée »", () => {
			render(<OrderStatusTimeline order={returnedOrder()} />);
			expect(screen.getByText("Retournée")).toBeInTheDocument();
		});

		it("conserve les étapes antérieures comme complétées", () => {
			render(<OrderStatusTimeline order={returnedOrder()} />);
			for (const label of ["En préparation", "Expédiée", "Livrée"]) {
				expect(stepLabel(label).className).toContain("text-foreground");
			}
		});

		it("n'affiche pas d'étape « Retournée » sur une commande normale", () => {
			render(
				<OrderStatusTimeline
					order={createOrder({
						status: "DELIVERED",
						paymentStatus: "PAID",
					})}
				/>,
			);
			expect(screen.queryByText("Retournée")).toBeNull();
		});
	});

	// Un remboursement n'annule pas le fait que le paiement a été reçu. Avant
	// correction, l'étape « Paiement reçu » d'une commande remboursée était ni
	// complétée ni en échec : muette et sans date.
	describe("refunded order", () => {
		it.each(["REFUNDED", "PARTIALLY_REFUNDED"] as const)(
			"marque « Paiement reçu » comme complété pour %s",
			(paymentStatus) => {
				render(
					<OrderStatusTimeline
						order={createOrder({
							status: "DELIVERED",
							paymentStatus,
							paidAt: PAID_DATE,
						})}
					/>,
				);
				expect(screen.getByText("Paiement reçu").className).toContain("text-foreground");
			},
		);
	});
});
