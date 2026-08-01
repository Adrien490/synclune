import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("date-fns", () => ({
	format: (_date: unknown, _fmt: string, _options?: unknown) => "1 janvier 2026",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("@/modules/orders/utils/carrier.utils", () => ({
	getCarrierLabel: (carrier: string) => {
		const labels: Record<string, string> = {
			colissimo: "Colissimo",
			chronopost: "Chronopost",
			mondial_relay: "Mondial Relay",
		};
		return labels[carrier] ?? "Autre transporteur";
	},
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild: _asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => <div {...props}>{children}</div>,
}));

vi.mock("lucide-react", () => ({
	ExternalLink: () => <svg data-testid="icon-external-link" />,
}));

import { OrderTracking } from "../order-tracking";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function createOrder(
	overrides: Partial<{
		status: string;
		paymentStatus: string;
		shippingCountry: string;
		trackingNumber: string | null;
		trackingUrl: string | null;
		shippingCarrier: string | null;
		shippedAt: Date | null;
		estimatedDelivery: Date | null;
		actualDelivery: Date | null;
	}> = {},
) {
	return {
		// Paire cohérente avec un numéro de suivi présent (fix mark-as-shipped)
		status: "SHIPPED",
		paymentStatus: "PAID",
		shippingCountry: "FR",
		trackingNumber: "1Z999AA10123456784",
		trackingUrl: "https://track.example.com/1Z999AA10123456784",
		shippingCarrier: "colissimo",
		shippedAt: new Date("2026-01-01"),
		estimatedDelivery: null,
		actualDelivery: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderTracking", () => {
	// Audit 2026-08-01 : entre paiement et expédition, la section rendait `null`
	// — aucune info de délai sur la seule surface client, précisément pendant la
	// période où le client se pose la question.
	it("affiche la promesse de délai (préparation + transport) sur une commande payée non expédiée", () => {
		render(<OrderTracking order={createOrder({ trackingNumber: null, status: "PROCESSING" })} />);
		expect(screen.getByText(/préparée à l'atelier sous 2 à 4 jours ouvrés/i)).toBeInTheDocument();
		expect(screen.getByText(/2-4 jours ouvrés de livraison/i)).toBeInTheDocument();
	});

	it("utilise le délai de transport EU pour une commande hors France", () => {
		render(
			<OrderTracking
				order={createOrder({ trackingNumber: null, status: "PROCESSING", shippingCountry: "BE" })}
			/>,
		);
		expect(screen.getByText(/5-8 jours ouvrés de livraison/i)).toBeInTheDocument();
	});

	it("returns null without trackingNumber when the order is cancelled", () => {
		const { container } = render(
			<OrderTracking order={createOrder({ trackingNumber: null, status: "CANCELLED" })} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("returns null without trackingNumber when payment is still pending", () => {
		const { container } = render(
			<OrderTracking
				order={createOrder({ trackingNumber: null, status: "PENDING", paymentStatus: "PENDING" })}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("shows 'Suivi de livraison' heading", () => {
		render(<OrderTracking order={createOrder()} />);
		expect(screen.getByRole("heading", { name: "Suivi de livraison" })).toBeInTheDocument();
	});

	it("shows the tracking number in a code element", () => {
		render(<OrderTracking order={createOrder({ trackingNumber: "1Z999AA10123456784" })} />);
		const codeEl = document.querySelector("code");
		expect(codeEl).toBeTruthy();
		expect(codeEl?.textContent).toBe("1Z999AA10123456784");
	});

	it("shows the carrier label when shippingCarrier is set", () => {
		render(<OrderTracking order={createOrder({ shippingCarrier: "colissimo" })} />);
		expect(screen.getByText("Colissimo")).toBeInTheDocument();
	});

	it("shows 'Suivre mon colis' link when trackingUrl is set", () => {
		render(<OrderTracking order={createOrder({ trackingUrl: "https://track.example.com/123" })} />);
		const link = screen.getByRole("link", {
			name: /Suivre mon colis/i,
		});
		expect(link).toBeInTheDocument();
		expect(link.getAttribute("href")).toBe("https://track.example.com/123");
		// URL externe saisie par l'admin : la protection contre le reverse
		// tabnabbing existait dans le code sans être verrouillée (audit 2026-08-01).
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("does not show 'Suivre mon colis' when trackingUrl is null", () => {
		render(<OrderTracking order={createOrder({ trackingUrl: null })} />);
		expect(screen.queryByRole("link", { name: /Suivre mon colis/i })).not.toBeInTheDocument();
	});

	it("shows estimated delivery when set and not yet delivered", () => {
		render(
			<OrderTracking
				order={createOrder({ estimatedDelivery: new Date("2026-01-05"), actualDelivery: null })}
			/>,
		);
		expect(screen.getByText(/Livraison estimée/i)).toBeInTheDocument();
	});

	it("hides estimated delivery once actualDelivery is set", () => {
		render(
			<OrderTracking
				order={createOrder({
					estimatedDelivery: new Date("2026-01-05"),
					actualDelivery: new Date("2026-01-04"),
				})}
			/>,
		);
		expect(screen.queryByText(/Livraison estimée/i)).not.toBeInTheDocument();
		expect(screen.getByText(/Livré le/i)).toBeInTheDocument();
	});
});
