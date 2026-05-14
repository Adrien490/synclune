import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	Info: () => <svg data-testid="icon-info" />,
	Copy: () => <svg data-testid="icon-copy" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ text, label }: { text: string; label: string }) => (
		<button data-testid="copy-button" data-text={text} data-label={label}>
			Copy
		</button>
	),
}));

import { DiscountDetailInfoCard } from "../discount-detail-info-card";

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
	startsAt: new Date("2026-01-01"),
	endsAt: null,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
	_count: { usages: 0 },
};

describe("DiscountDetailInfoCard", () => {
	afterEach(cleanup);

	it("affiche le statut, type et valeur", () => {
		render(<DiscountDetailInfoCard discount={baseDiscount as any} />);
		expect(screen.getByText("Statut")).toBeInTheDocument();
		expect(screen.getByText("Type")).toBeInTheDocument();
		expect(screen.getByText("Valeur")).toBeInTheDocument();
		expect(screen.getByText("Pourcentage")).toBeInTheDocument();
		expect(screen.getByText("10%")).toBeInTheDocument();
	});

	it("affiche le badge Actif pour discount actif valide", () => {
		render(<DiscountDetailInfoCard discount={baseDiscount as any} />);
		expect(screen.getByTestId("badge")).toHaveTextContent("Actif");
	});

	it("expose un CopyButton pour le code", () => {
		render(<DiscountDetailInfoCard discount={baseDiscount as any} />);
		const copy = screen.getByTestId("copy-button");
		expect(copy).toHaveAttribute("data-text", "PROMO10");
		expect(copy).toHaveAttribute("data-label", "Code");
	});

	it("affiche le montant min commande quand défini", () => {
		render(<DiscountDetailInfoCard discount={{ ...baseDiscount, minOrderAmount: 5000 } as any} />);
		expect(screen.getByText(/Montant min/)).toBeInTheDocument();
	});

	it("n'affiche pas le montant min commande quand null", () => {
		render(<DiscountDetailInfoCard discount={baseDiscount as any} />);
		expect(screen.queryByText(/Montant min/)).not.toBeInTheDocument();
	});

	it("affiche le max par utilisateur quand défini", () => {
		render(<DiscountDetailInfoCard discount={{ ...baseDiscount, maxUsagePerUser: 3 } as any} />);
		expect(screen.getByText("Max par utilisateur")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});
});
