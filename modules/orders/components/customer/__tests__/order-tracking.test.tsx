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
		trackingNumber: string | null;
		trackingUrl: string | null;
		shippingCarrier: string | null;
		shippedAt: Date | null;
		actualDelivery: Date | null;
	}> = {},
) {
	return {
		trackingNumber: "1Z999AA10123456784",
		trackingUrl: "https://track.example.com/1Z999AA10123456784",
		shippingCarrier: "colissimo",
		shippedAt: new Date("2026-01-01"),
		actualDelivery: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderTracking", () => {
	it("returns null when trackingNumber is null", () => {
		const { container } = render(<OrderTracking order={createOrder({ trackingNumber: null })} />);
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
	});

	it("does not show 'Suivre mon colis' when trackingUrl is null", () => {
		render(<OrderTracking order={createOrder({ trackingUrl: null })} />);
		expect(screen.queryByRole("link", { name: /Suivre mon colis/i })).not.toBeInTheDocument();
	});
});
