import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("lucide-react", () => ({
	Package: ({ className }: { className?: string }) => (
		<svg data-testid="icon-package" className={className} />
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { ShippingMethodSection } from "../shipping-method-section";
import type { ShippingRate } from "@/modules/orders/constants/shipping-rates";

// ============================================================================
// HELPERS
// ============================================================================

function createShippingRate(overrides: Partial<ShippingRate> = {}): ShippingRate {
	return {
		id: "colissimo-fr",
		displayName: "Colissimo France",
		price: 490,
		estimatedDays: "2-3 jours ouvrés",
		...overrides,
	} as unknown as ShippingRate;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ShippingMethodSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Unavailable ──────────────────────────────────────────────────────────

	it("renders unavailable message when shippingUnavailable=true", () => {
		render(<ShippingMethodSection shipping={490} shippingUnavailable={true} shippingInfo={null} />);
		expect(screen.getByText(/ne livrons pas encore/i)).toBeInTheDocument();
	});

	it("does not render package icon when unavailable", () => {
		render(<ShippingMethodSection shipping={490} shippingUnavailable={true} shippingInfo={null} />);
		expect(screen.queryByTestId("icon-package")).not.toBeInTheDocument();
	});

	// ─── Available ────────────────────────────────────────────────────────────

	it("renders package icon when available", () => {
		render(
			<ShippingMethodSection
				shipping={490}
				shippingUnavailable={false}
				shippingInfo={createShippingRate()}
			/>,
		);
		expect(screen.getByTestId("icon-package")).toBeInTheDocument();
	});

	it("shows shipping info displayName", () => {
		render(
			<ShippingMethodSection
				shipping={490}
				shippingUnavailable={false}
				shippingInfo={createShippingRate({ displayName: "Colissimo France" })}
			/>,
		);
		expect(screen.getByText("Colissimo France")).toBeInTheDocument();
	});

	it("shows formatted price", () => {
		render(
			<ShippingMethodSection
				shipping={490}
				shippingUnavailable={false}
				shippingInfo={createShippingRate()}
			/>,
		);
		expect(screen.getByText("4.90 €")).toBeInTheDocument();
	});

	it("shows estimated delivery time", () => {
		render(
			<ShippingMethodSection
				shipping={490}
				shippingUnavailable={false}
				shippingInfo={createShippingRate({ estimatedDays: "2-3 jours ouvrés" })}
			/>,
		);
		expect(screen.getByText("2-3 jours ouvrés")).toBeInTheDocument();
	});

	it("shows fallback 'Livraison standard' when shippingInfo is null", () => {
		render(
			<ShippingMethodSection shipping={490} shippingUnavailable={false} shippingInfo={null} />,
		);
		expect(screen.getByText("Livraison standard")).toBeInTheDocument();
	});

	it("does not show estimatedDays when shippingInfo is null", () => {
		render(
			<ShippingMethodSection shipping={490} shippingUnavailable={false} shippingInfo={null} />,
		);
		expect(screen.queryByText(/jours/i)).not.toBeInTheDocument();
	});

	it("shows free shipping as 0.00 €", () => {
		render(
			<ShippingMethodSection
				shipping={0}
				shippingUnavailable={false}
				shippingInfo={createShippingRate({ displayName: "Livraison offerte" })}
			/>,
		);
		expect(screen.getByText("0.00 €")).toBeInTheDocument();
	});
});
