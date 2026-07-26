import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { capturedLongPressProps } = vi.hoisted(() => ({
	capturedLongPressProps: { value: null as unknown },
}));

vi.mock("@/shared/components/long-press-menu-link", () => ({
	LongPressMenuLink: ({ children, ...props }: { children: React.ReactNode }) => {
		capturedLongPressProps.value = props;
		return <div data-testid="card">{children}</div>;
	},
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/components/ui/item", () => ({
	Item: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/modules/discounts/hooks/use-discount-actions", () => ({
	useDiscountActions: () => ({ sections: [] }),
}));

vi.mock("lucide-react", () => ({
	Loader2: () => <svg data-testid="loader" />,
}));

import { DiscountMobileItem } from "../discount-mobile-item";

describe("DiscountMobileItem link target", () => {
	afterEach(() => {
		capturedLongPressProps.value = null;
		cleanup();
	});

	it("href pointe vers la page détail (pas /modifier)", () => {
		const discount = {
			id: "d-42",
			code: "PROMO20",
			type: "PERCENTAGE",
			value: 20,
			minOrderAmount: null,
			maxUsageCount: null,
			maxUsagePerUser: null,
			usageCount: 0,
			isActive: true,
			startsAt: new Date("2026-01-01"),
			endsAt: null,
			createdAt: new Date("2026-01-01"),
			_count: { usages: 0 },
		} as never;

		render(<DiscountMobileItem discount={discount} />);

		expect(capturedLongPressProps.value).toMatchObject({
			href: "/admin/marketing/discounts/d-42",
		});
	});
});
