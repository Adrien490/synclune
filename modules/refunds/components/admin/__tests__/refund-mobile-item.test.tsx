import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockOpen, mockUseDialog, mockUseHaptic, mockHaptic } = vi.hoisted(() => {
	const mockOpen = vi.fn();
	const mockHaptic = vi.fn();
	return {
		mockOpen,
		mockUseDialog: vi.fn(() => ({ open: mockOpen, isOpen: false, close: vi.fn() })),
		mockUseHaptic: vi.fn(() => mockHaptic),
		mockHaptic,
	};
});

vi.mock("@/shared/providers/dialog-store-provider", () => ({ useDialog: mockUseDialog }));
vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: mockUseHaptic }));
vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));
vi.mock("../refund-row-actions", () => ({
	RefundRowActions: () => null,
}));
vi.mock("./refund-item-drawer", () => ({
	REFUND_ITEM_DRAWER_ID: "refund-item-drawer",
}));

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
	beforeEach(() => {
		vi.clearAllMocks();
	});

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

	it("renders accessible button label with order number", () => {
		render(<RefundMobileItem refund={REFUND} />);

		expect(
			screen.getByRole("button", { name: /Ouvrir la fiche du remboursement SYN-2026-0001/i }),
		).toBeInTheDocument();
	});

	it("calls open with the refund data when button is clicked", async () => {
		render(<RefundMobileItem refund={REFUND} />);

		await userEvent.click(screen.getByRole("button"));

		expect(mockOpen).toHaveBeenCalledWith({ refund: REFUND });
	});

	it("triggers haptic 'selection' feedback when clicked", async () => {
		render(<RefundMobileItem refund={REFUND} />);

		await userEvent.click(screen.getByRole("button"));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("renders the status badge with correct variant", () => {
		render(<RefundMobileItem refund={REFUND} />);

		const badges = screen.getAllByTestId("badge");
		expect(badges[0]).toBeInTheDocument();
	});
});
