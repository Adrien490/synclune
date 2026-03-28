import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({
		children,
		className,
		"aria-busy": ariaBusy,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		"aria-busy"?: boolean;
		"aria-label"?: string;
	}) => (
		<div className={className} aria-busy={ariaBusy} aria-label={ariaLabel}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({
		children,
		"aria-hidden": ariaHidden,
	}: {
		children: React.ReactNode;
		"aria-hidden"?: boolean;
	}) => <table aria-hidden={ariaHidden}>{children}</table>,
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
	TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<th className={className}>{children}</th>
	),
	TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

import { ReviewsDataTableSkeleton } from "../reviews-data-table-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewsDataTableSkeleton", () => {
	it("renders without error", () => {
		render(<ReviewsDataTableSkeleton />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});

	it("renders with aria-busy='true'", () => {
		render(<ReviewsDataTableSkeleton />);
		const card = document.querySelector("[aria-busy='true']");
		expect(card).not.toBeNull();
	});

	it("renders with aria-label 'Chargement des avis'", () => {
		render(<ReviewsDataTableSkeleton />);
		expect(screen.getByLabelText("Chargement des avis")).toBeInTheDocument();
	});

	it("renders column headers", () => {
		render(<ReviewsDataTableSkeleton />);
		expect(screen.getByText("Produit")).toBeInTheDocument();
		expect(screen.getByText("Client")).toBeInTheDocument();
		expect(screen.getByText("Note")).toBeInTheDocument();
		expect(screen.getByText("Statut")).toBeInTheDocument();
		expect(screen.getByText("Date")).toBeInTheDocument();
		expect(screen.getByText("Réponse")).toBeInTheDocument();
		expect(screen.getByText("Actions")).toBeInTheDocument();
	});

	it("renders 10 skeleton rows", () => {
		render(<ReviewsDataTableSkeleton />);
		const rows = document.querySelectorAll("tbody tr");
		expect(rows.length).toBe(10);
	});
});
