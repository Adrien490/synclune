import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/shared/components/item-checkbox", () => ({
	ItemCheckbox: () => <input type="checkbox" />,
}));

vi.mock("@/shared/components/select-all-checkbox", () => ({
	SelectAllCheckbox: () => <input type="checkbox" aria-label="Tout sélectionner" />,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
		actionElement,
	}: {
		title: string;
		description: string;
		icon?: unknown;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="table-empty-state">
			<p>{title}</p>
			<p>{description}</p>
			{actionElement}
		</div>
	),
}));

vi.mock("@/shared/components/ui/table", () => ({
	Table: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		caption?: string;
		striped?: boolean;
		className?: string;
	}) => <table aria-label={ariaLabel}>{children}</table>,
	TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
	TableCell: ({ children }: { children: React.ReactNode; className?: string }) => (
		<td>{children}</td>
	),
	TableHead: ({ children }: { children: React.ReactNode; className?: string }) => (
		<th>{children}</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/modules/customizations/components/admin/customization-row-actions", () => ({
	CustomizationRowActions: () => <div data-testid="row-actions" />,
}));

vi.mock("@/modules/customizations/components/admin/customization-selection-toolbar", () => ({
	CustomizationSelectionToolbar: () => <div data-testid="selection-toolbar" />,
}));

vi.mock("@/modules/customizations/components/admin/customization-status-badge", () => ({
	CustomizationStatusBadge: ({ status }: { status: string }) => (
		<span data-testid="status-badge">{status}</span>
	),
}));

vi.mock("@/modules/customizations/components/admin/update-notes-dialog", () => ({
	UpdateNotesDialog: () => <div data-testid="update-notes-dialog" />,
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: () => "01/01/2026",
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	Sparkles: () => <svg data-testid="icon-sparkles" />,
	StickyNote: () => <svg data-testid="icon-sticky-note" />,
}));

import { CustomizationsDataTable } from "../customizations-data-table";
import type { GetCustomizationRequestsResult } from "@/modules/customizations/data/get-customization-requests";

// ============================================================================
// HELPERS
// ============================================================================

function createResult(
	overrides: Partial<GetCustomizationRequestsResult> = {},
): Promise<GetCustomizationRequestsResult> {
	return Promise.resolve({
		items: [],
		pagination: {
			nextCursor: null,
			prevCursor: null,
			hasNextPage: false,
			hasPreviousPage: false,
		},
		...overrides,
	});
}

function createRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "req-1",
		firstName: "Marie",
		email: "marie@example.com",
		productTypeLabel: "Bague",
		status: "PENDING" as const,
		adminNotes: null,
		createdAt: new Date("2026-01-01"),
		_count: { inspirationProducts: 0 },
		...overrides,
	};
}

async function renderWithSuspense(data: GetCustomizationRequestsResult, perPage = 10) {
	const promise = Promise.resolve(data);
	await act(async () => {
		render(
			<React.Suspense fallback={<div data-testid="suspense-fallback" />}>
				<CustomizationsDataTable requestsPromise={promise} perPage={perPage} />
			</React.Suspense>,
		);
	});
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationsDataTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders empty state when no requests", async () => {
		await renderWithSuspense({
			items: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByText("Aucune demande trouvée")).toBeInTheDocument();
	});

	it("renders the empty state description", async () => {
		await renderWithSuspense({
			items: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByText(/Aucune demande de personnalisation/)).toBeInTheDocument();
	});

	it("renders the reset filters link in empty state", async () => {
		await renderWithSuspense({
			items: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByRole("link", { name: "Réinitialiser les filtres" })).toBeInTheDocument();
	});

	it("renders the table with requests", async () => {
		await renderWithSuspense({
			items: [createRequest()],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByRole("table")).toBeInTheDocument();
	});

	it("renders client name and email", async () => {
		await renderWithSuspense({
			items: [createRequest({ firstName: "Marie", email: "marie@example.com" })],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByText("Marie")).toBeInTheDocument();
		expect(screen.getByText("marie@example.com")).toBeInTheDocument();
	});

	it("renders product type label", async () => {
		await renderWithSuspense({
			items: [createRequest({ productTypeLabel: "Bague" })],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByText("Bague")).toBeInTheDocument();
	});

	it("shows inspiration products count when > 0", async () => {
		await renderWithSuspense({
			items: [createRequest({ _count: { inspirationProducts: 3 } })],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByText("3 produit(s)")).toBeInTheDocument();
	});

	it("renders the StickyNote icon when adminNotes is set", async () => {
		await renderWithSuspense({
			items: [createRequest({ adminNotes: "Some note" })],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByTestId("icon-sticky-note")).toBeInTheDocument();
	});

	it("renders the cursor pagination", async () => {
		await renderWithSuspense({
			items: [createRequest()],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders UpdateNotesDialog", async () => {
		await renderWithSuspense({
			items: [createRequest()],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		});
		expect(screen.getByTestId("update-notes-dialog")).toBeInTheDocument();
	});
});
