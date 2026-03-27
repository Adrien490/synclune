import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="empty" className={className}>
			{children}
		</div>
	),
	EmptyHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-header">{children}</div>
	),
	EmptyMedia: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-media">{children}</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-title">{children}</div>
	),
	EmptyDescription: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-description">{children}</div>
	),
	EmptyActions: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-actions">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild: _asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => (
		<button data-testid="button" {...props}>
			{children}
		</button>
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	PackageIcon: () => <svg data-testid="package-icon" />,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { TableEmptyState } from "../table-empty-state";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// HELPERS
// ============================================================================

const MockIcon = (() => <svg data-testid="mock-icon" />) as unknown as LucideIcon;

const defaultProps = {
	icon: MockIcon,
	title: "Aucune commande trouvée",
	description: "Aucune commande ne correspond aux critères.",
};

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("TableEmptyState", () => {
	// ─── Basic rendering ───────────────────────────────────────────────────

	it("renders the title", () => {
		render(<TableEmptyState {...defaultProps} />);

		expect(screen.getByTestId("empty-title")).toHaveTextContent("Aucune commande trouvée");
	});

	it("renders the description", () => {
		render(<TableEmptyState {...defaultProps} />);

		expect(screen.getByTestId("empty-description")).toHaveTextContent(
			"Aucune commande ne correspond aux critères.",
		);
	});

	it("renders the icon inside EmptyMedia", () => {
		render(<TableEmptyState {...defaultProps} />);

		expect(screen.getByTestId("empty-media")).toBeInTheDocument();
		expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
	});

	// ─── Description logic ─────────────────────────────────────────────────

	it("uses noItemsDescription when hasActiveFilters=false", () => {
		render(
			<TableEmptyState
				{...defaultProps}
				hasActiveFilters={false}
				noItemsDescription="La liste est vide."
			/>,
		);

		expect(screen.getByTestId("empty-description")).toHaveTextContent("La liste est vide.");
	});

	it("falls back to description when hasActiveFilters=false and no noItemsDescription", () => {
		render(<TableEmptyState {...defaultProps} hasActiveFilters={false} />);

		expect(screen.getByTestId("empty-description")).toHaveTextContent(
			"Aucune commande ne correspond aux critères.",
		);
	});

	it("uses description when hasActiveFilters=true even if noItemsDescription exists", () => {
		render(
			<TableEmptyState
				{...defaultProps}
				hasActiveFilters={true}
				noItemsDescription="La liste est vide."
			/>,
		);

		expect(screen.getByTestId("empty-description")).toHaveTextContent(
			"Aucune commande ne correspond aux critères.",
		);
	});

	it("uses description when hasActiveFilters is undefined", () => {
		render(<TableEmptyState {...defaultProps} noItemsDescription="La liste est vide." />);

		expect(screen.getByTestId("empty-description")).toHaveTextContent(
			"Aucune commande ne correspond aux critères.",
		);
	});

	// ─── Action link button ────────────────────────────────────────────────

	it("renders EmptyActions with a link button when action is provided", () => {
		render(
			<TableEmptyState
				{...defaultProps}
				action={{ label: "Créer une commande", href: "/admin/commandes/nouveau" }}
			/>,
		);

		expect(screen.getByTestId("empty-actions")).toBeInTheDocument();
		const link = screen.getByRole("link", { name: "Créer une commande" });
		expect(link).toHaveAttribute("href", "/admin/commandes/nouveau");
	});

	// ─── Custom actionElement ──────────────────────────────────────────────

	it("renders EmptyActions with custom actionElement when provided", () => {
		render(
			<TableEmptyState {...defaultProps} actionElement={<button>Action personnalisée</button>} />,
		);

		expect(screen.getByTestId("empty-actions")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Action personnalisée" })).toBeInTheDocument();
	});

	it("prefers actionElement over action when both are provided", () => {
		render(
			<TableEmptyState
				{...defaultProps}
				action={{ label: "Via action", href: "/action" }}
				actionElement={<button>Via element</button>}
			/>,
		);

		expect(screen.getByRole("button", { name: "Via element" })).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Via action" })).toBeNull();
	});

	// ─── No actions ────────────────────────────────────────────────────────

	it("does not render EmptyActions when neither action nor actionElement is provided", () => {
		render(<TableEmptyState {...defaultProps} />);

		expect(screen.queryByTestId("empty-actions")).toBeNull();
	});
});
