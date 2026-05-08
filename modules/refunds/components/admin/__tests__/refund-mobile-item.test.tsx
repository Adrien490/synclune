import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/long-press-menu-link", () => ({
	LongPressMenuLink: ({
		href,
		ariaLabel,
		children,
		className,
	}: {
		href: string;
		ariaLabel: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} aria-label={ariaLabel} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/modules/refunds/hooks/use-refund-actions", () => ({
	useRefundActions: () => ({ sections: [] }),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/item", () => ({
	Item: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { RefundMobileItem } from "../refund-mobile-item";

afterEach(cleanup);

const REFUND = {
	id: "refund-1",
	status: "PENDING" as const,
	amount: 4990,
	reason: "CUSTOMER_REQUEST" as const,
	createdAt: new Date("2026-04-01T12:00:00Z"),
	order: {
		id: "order-1",
		orderNumber: "SYN-2026-0001",
		customerName: "Marie Dupont",
		customerEmail: "marie@example.com",
	},
};

describe("RefundMobileItem", () => {
	it("renders the order number", () => {
		render(<RefundMobileItem refund={REFUND} />);
		expect(screen.getByText("SYN-2026-0001")).toBeInTheDocument();
	});

	it("renders the customer name when present", () => {
		render(<RefundMobileItem refund={REFUND} />);
		expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
	});

	it("falls back to customer email when name is null", () => {
		render(
			<RefundMobileItem refund={{ ...REFUND, order: { ...REFUND.order, customerName: null } }} />,
		);
		expect(screen.getByText("marie@example.com")).toBeInTheDocument();
	});

	it("displays the formatted amount", () => {
		render(<RefundMobileItem refund={REFUND} />);
		expect(screen.getByText(/49,90/i)).toBeInTheDocument();
	});

	it("navigue vers la page détail du remboursement au tap (Link href)", () => {
		render(<RefundMobileItem refund={REFUND} />);
		const link = screen.getByLabelText(/Remboursement SYN-2026-0001/i);
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/admin/ventes/remboursements/refund-1");
	});

	it("renders the status badge", () => {
		render(<RefundMobileItem refund={REFUND} />);
		const badges = screen.getAllByTestId("badge");
		expect(badges[0]).toBeInTheDocument();
	});
});
