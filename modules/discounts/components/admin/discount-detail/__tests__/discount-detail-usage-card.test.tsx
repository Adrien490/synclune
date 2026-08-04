import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	Activity: () => <svg data-testid="icon-activity" />,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/components/ui/progress", () => ({
	Progress: ({ value, "aria-label": ariaLabel }: { value: number; "aria-label": string }) => (
		<div data-testid="progress" data-value={value} aria-label={ariaLabel} />
	),
}));

import { DiscountDetailUsageCard } from "../discount-detail-usage-card";

const baseDiscount = {
	id: "d-1",
	code: "PROMO10",
	type: "PERCENTAGE" as const,
	value: 10,
	minOrderAmount: null,
	maxUsagePerUser: null,
	isActive: true,
	endsAt: null,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
	_count: { usages: 0 },
};

describe("DiscountDetailUsageCard", () => {
	afterEach(cleanup);

	it("affiche les utilisations avec progression si maxUsageCount défini", () => {
		render(
			<DiscountDetailUsageCard
				discount={{ ...baseDiscount, usageCount: 5, maxUsageCount: 100 } as any}
			/>,
		);
		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText(/\/ 100/)).toBeInTheDocument();
		expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "5");
	});

	it("affiche infini et pas de progression si maxUsageCount null", () => {
		render(
			<DiscountDetailUsageCard
				discount={{ ...baseDiscount, usageCount: 5, maxUsageCount: null } as any}
			/>,
		);
		expect(screen.getByText(/∞/)).toBeInTheDocument();
		expect(screen.queryByTestId("progress")).not.toBeInTheDocument();
		expect(screen.getByText(/illimitée/i)).toBeInTheDocument();
	});

	it("affiche 'Limite atteinte' quand restant = 0", () => {
		render(
			<DiscountDetailUsageCard
				discount={{ ...baseDiscount, usageCount: 100, maxUsageCount: 100 } as any}
			/>,
		);
		expect(screen.getByText(/Limite atteinte/i)).toBeInTheDocument();
	});

	it("singulier pour 1 utilisation restante", () => {
		render(
			<DiscountDetailUsageCard
				discount={{ ...baseDiscount, usageCount: 99, maxUsageCount: 100 } as any}
			/>,
		);
		expect(screen.getByText("1 utilisation restante.")).toBeInTheDocument();
	});

	it("pluriel pour plusieurs utilisations restantes", () => {
		render(
			<DiscountDetailUsageCard
				discount={{ ...baseDiscount, usageCount: 5, maxUsageCount: 100 } as any}
			/>,
		);
		expect(screen.getByText("95 utilisations restantes.")).toBeInTheDocument();
	});
});
