import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetDiscountUsages } = vi.hoisted(() => ({
	mockGetDiscountUsages: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: vi.fn(),
	data: {
		discountId: "d-1",
		discountCode: "PROMO10",
	} as { discountId: string; discountCode: string; [key: string]: unknown } | null,
};

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => mockDialogState,
}));

vi.mock("@/modules/discounts/data/admin/get-discount-usages", () => ({
	getDiscountUsages: mockGetDiscountUsages,
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({ children }: { children: React.ReactNode }) => (
		<table data-testid="usages-table">{children}</table>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
	TableCell: ({ children }: { children: React.ReactNode; className?: string }) => (
		<td>{children}</td>
	),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("date-fns", () => ({
	format: (_date: Date, _fmt: string) => "15 janv. 2026 10:30",
}));

vi.mock("date-fns/locale", () => ({
	fr: {},
}));

vi.mock("lucide-react", () => ({
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
	Receipt: ({ className }: { className?: string }) => (
		<svg data-testid="icon-receipt" className={className} />
	),
}));

import { DiscountUsagesDialog } from "../discount-usages-dialog";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function createUsage(overrides: Record<string, unknown> = {}) {
	return {
		id: "u-1",
		createdAt: new Date("2026-01-15T10:30:00Z"),
		amountApplied: 1000,
		user: {
			id: "user-1",
			name: "Alice Dupont",
			email: "alice@example.com",
		},
		order: {
			id: "order-1",
			orderNumber: "CMD-001",
			total: 9000,
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountUsagesDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDialogState = {
			isOpen: true,
			close: vi.fn(),
			data: {
				discountId: "d-1",
				discountCode: "PROMO10",
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("renders nothing when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };
		mockGetDiscountUsages.mockResolvedValue({ usages: [], totalAmount: 0 });
		render(<DiscountUsagesDialog />);
		expect(screen.queryByTestId("responsive-dialog")).not.toBeInTheDocument();
	});

	it("shows title 'Utilisations du code promo' when open", async () => {
		mockGetDiscountUsages.mockResolvedValue({ usages: [], totalAmount: 0 });
		render(<DiscountUsagesDialog />);
		expect(screen.getByText("Utilisations du code promo")).toBeInTheDocument();
	});

	it("shows discount code in description", async () => {
		mockGetDiscountUsages.mockResolvedValue({ usages: [], totalAmount: 0 });
		render(<DiscountUsagesDialog />);
		expect(screen.getByText("PROMO10")).toBeInTheDocument();
	});

	// ─── Loading state ────────────────────────────────────────────────────────

	it("shows loading spinner while fetching", async () => {
		mockGetDiscountUsages.mockReturnValue(new Promise(() => {}));
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getByTestId("loader")).toBeInTheDocument();
		});
	});

	// ─── Error state ──────────────────────────────────────────────────────────

	it("shows error message when fetch fails with error result", async () => {
		mockGetDiscountUsages.mockResolvedValue({ error: "Accès refusé" });
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getByText("Accès refusé")).toBeInTheDocument();
		});
	});

	it("shows generic error message when fetch throws", async () => {
		mockGetDiscountUsages.mockRejectedValue(new Error("network error"));
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getByText("Erreur lors du chargement")).toBeInTheDocument();
		});
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("shows empty state when no usages", async () => {
		mockGetDiscountUsages.mockResolvedValue({ usages: [], totalAmount: 0 });
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getByText("Ce code n'a pas encore été utilisé")).toBeInTheDocument();
		});
	});

	it("shows receipt icon in empty state", async () => {
		mockGetDiscountUsages.mockResolvedValue({ usages: [], totalAmount: 0 });
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getByTestId("icon-receipt")).toBeInTheDocument();
		});
	});

	// ─── Table with usages ────────────────────────────────────────────────────

	it("renders table when usages are present", async () => {
		mockGetDiscountUsages.mockResolvedValue({
			usages: [createUsage()],
			totalAmount: 1000,
		});
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getByTestId("usages-table")).toBeInTheDocument();
		});
	});

	it("shows order number as link in mobile and desktop views", async () => {
		mockGetDiscountUsages.mockResolvedValue({
			usages: [createUsage()],
			totalAmount: 1000,
		});
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getAllByText("CMD-001").length).toBeGreaterThanOrEqual(1);
		});
	});

	it("shows user name and email in mobile and desktop views", async () => {
		mockGetDiscountUsages.mockResolvedValue({
			usages: [createUsage()],
			totalAmount: 1000,
		});
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getAllByText("Alice Dupont").length).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText("alice@example.com").length).toBeGreaterThanOrEqual(1);
		});
	});

	it("shows 'Invité' when user is null in mobile and desktop views", async () => {
		mockGetDiscountUsages.mockResolvedValue({
			usages: [createUsage({ user: null })],
			totalAmount: 1000,
		});
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getAllByText("Invité").length).toBeGreaterThanOrEqual(1);
		});
	});

	it("shows usage count summary", async () => {
		mockGetDiscountUsages.mockResolvedValue({
			usages: [createUsage(), createUsage({ id: "u-2" })],
			totalAmount: 2000,
		});
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getByText("Nombre d'utilisations:")).toBeInTheDocument();
		});
	});

	it("shows close button", async () => {
		mockGetDiscountUsages.mockResolvedValue({ usages: [], totalAmount: 0 });
		render(<DiscountUsagesDialog />);
		await waitFor(() => {
			expect(screen.getByText("Fermer")).toBeInTheDocument();
		});
	});
});
