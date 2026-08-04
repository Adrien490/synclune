import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	Calendar: () => <svg data-testid="icon-cal" />,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { DiscountDetailValidityCard } from "../discount-detail-validity-card";

const baseDiscount = {
	id: "d-1",
	code: "PROMO10",
	type: "PERCENTAGE" as const,
	value: 10,
	minOrderAmount: null,
	maxUsageCount: null,
	maxUsagePerUser: null,
	usageCount: 0,
	isActive: true,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
	_count: { usages: 0 },
};

describe("DiscountDetailValidityCard", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-14T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
	});

	it("affiche un indice 'Se termine …' pour un discount actif avec fin", () => {
		const { container } = render(
			<DiscountDetailValidityCard
				discount={{ ...baseDiscount, endsAt: new Date("2026-12-31") } as any}
			/>,
		);
		const hint = container.querySelector("p.italic");
		expect(hint?.textContent).toMatch(/^Se termine/i);
	});

	it("affiche un indice 'A expiré …' pour un discount terminé", () => {
		const { container } = render(
			<DiscountDetailValidityCard
				discount={{ ...baseDiscount, endsAt: new Date("2025-12-31") } as any}
			/>,
		);
		const hint = container.querySelector("p.italic");
		expect(hint?.textContent).toMatch(/^A expiré/i);
	});

	it("affiche un indice 'Validité sans date de fin' si endsAt null", () => {
		const { container } = render(
			<DiscountDetailValidityCard discount={{ ...baseDiscount, endsAt: null } as any} />,
		);
		const hint = container.querySelector("p.italic");
		expect(hint?.textContent).toBe("Validité sans date de fin");
	});

	// Il n'y a plus de date de DÉBUT (`Discount.startsAt` retiré le 2026-08-04) :
	// la carte n'affiche qu'une ligne, et il n'existe plus d'indice « Démarre … ».
	it("n'affiche pas de date de début", () => {
		render(<DiscountDetailValidityCard discount={{ ...baseDiscount, endsAt: null } as any} />);
		expect(screen.queryByText("Démarre le")).not.toBeInTheDocument();
	});
});
