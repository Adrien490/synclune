import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../discount-detail-header", () => ({
	DiscountDetailHeader: ({ discount }: { discount: { code: string } }) => (
		<header data-testid="header">{discount.code}</header>
	),
}));

vi.mock("../discount-detail-info-card", () => ({
	DiscountDetailInfoCard: () => <section data-testid="info-card" />,
}));

vi.mock("../discount-detail-validity-card", () => ({
	DiscountDetailValidityCard: () => <section data-testid="validity-card" />,
}));

vi.mock("../discount-detail-usage-card", () => ({
	DiscountDetailUsageCard: () => <section data-testid="usage-card" />,
}));

import { DiscountDetailPage } from "../discount-detail-page";

const discount = {
	id: "d-1",
	code: "PROMO10",
	type: "PERCENTAGE" as const,
	value: 10,
	minOrderAmount: null,
	maxUsageCount: 100,
	maxUsagePerUser: null,
	usageCount: 5,
	isActive: true,
	startsAt: new Date("2026-01-01"),
	endsAt: new Date("2026-12-31"),
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
	_count: { usages: 5 },
} as any;

describe("DiscountDetailPage", () => {
	afterEach(cleanup);

	it("monte les 4 sous-composants attendus", () => {
		render(<DiscountDetailPage discount={discount} />);
		expect(screen.getByTestId("header")).toBeInTheDocument();
		expect(screen.getByTestId("info-card")).toBeInTheDocument();
		expect(screen.getByTestId("validity-card")).toBeInTheDocument();
		expect(screen.getByTestId("usage-card")).toBeInTheDocument();
	});

	it("transmet le discount au header", () => {
		render(<DiscountDetailPage discount={discount} />);
		expect(screen.getByTestId("header")).toHaveTextContent("PROMO10");
	});
});
