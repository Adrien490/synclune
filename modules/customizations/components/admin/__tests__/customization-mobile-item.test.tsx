import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockOpen, mockUseDialog, mockHaptic, mockUseHaptic } = vi.hoisted(() => {
	const mockOpen = vi.fn();
	const mockHaptic = vi.fn();
	return {
		mockOpen,
		mockUseDialog: vi.fn(() => ({ open: mockOpen, isOpen: false, close: vi.fn() })),
		mockHaptic,
		mockUseHaptic: vi.fn(() => mockHaptic),
	};
});

vi.mock("@/shared/providers/dialog-store-provider", () => ({ useDialog: mockUseDialog }));
vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: mockUseHaptic }));
vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/shared/lib/stripe", () => ({ stripe: {} }));
vi.mock("./customization-item-drawer", () => ({
	CUSTOMIZATION_ITEM_DRAWER_ID: "customization-item-drawer",
}));
vi.mock("../customization-status-badge", () => ({
	CustomizationStatusBadge: ({ status }: { status: string }) => (
		<span data-testid="status-badge">{status}</span>
	),
}));

vi.mock("@/shared/components/ui/item", () => ({
	Item: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { CustomizationMobileItem } from "../customization-mobile-item";

afterEach(cleanup);

const REQUEST = {
	id: "req-1",
	firstName: "Sophie",
	email: "sophie@example.com",
	status: "PENDING" as const,
	adminNotes: null,
	productTypeLabel: "Bague sur mesure",
	createdAt: new Date("2026-04-01"),
	_count: { inspirationProducts: 2 },
};

describe("CustomizationMobileItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the requester first name", () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		expect(screen.getByText("Sophie")).toBeInTheDocument();
	});

	it("renders the requester email", () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		expect(screen.getByText("sophie@example.com")).toBeInTheDocument();
	});

	it("renders the product type label", () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		expect(screen.getByText("Bague sur mesure")).toBeInTheDocument();
	});

	it("renders accessible label with first name", () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		expect(
			screen.getByRole("button", { name: /Ouvrir la demande de Sophie/i }),
		).toBeInTheDocument();
	});

	it("opens the drawer with mapped request payload on click", async () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		await userEvent.click(screen.getByRole("button"));

		expect(mockOpen).toHaveBeenCalledWith({
			request: expect.objectContaining({
				id: "req-1",
				firstName: "Sophie",
				inspirationCount: 2,
			}),
		});
	});

	it("triggers selection haptic on click", async () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		await userEvent.click(screen.getByRole("button"));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("renders the inspiration count when > 0", () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("does NOT render inspiration count when count is 0", () => {
		render(
			<CustomizationMobileItem request={{ ...REQUEST, _count: { inspirationProducts: 0 } }} />,
		);

		// inspiration count "0" should not appear (zero is hidden by guard)
		expect(screen.queryByText("0")).not.toBeInTheDocument();
	});

	it("renders the notes icon when adminNotes is present", () => {
		render(<CustomizationMobileItem request={{ ...REQUEST, adminNotes: "Note importante" }} />);

		expect(screen.getByLabelText("Notes internes")).toBeInTheDocument();
	});

	it("does NOT render the notes icon when adminNotes is null", () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		expect(screen.queryByLabelText("Notes internes")).not.toBeInTheDocument();
	});

	it("renders the status badge", () => {
		render(<CustomizationMobileItem request={REQUEST} />);

		expect(screen.getByTestId("status-badge")).toHaveTextContent("PENDING");
	});
});
