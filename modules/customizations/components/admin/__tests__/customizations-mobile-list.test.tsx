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

vi.mock("@/shared/components/ui/item", () => ({
	Item: ({
		children,
		"aria-roledescription": ariaRoleDesc,
	}: {
		children: React.ReactNode;
		variant?: string;
		size?: string;
		className?: string;
		"aria-roledescription"?: string;
	}) => <div aria-roledescription={ariaRoleDesc}>{children}</div>,
	ItemActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemContent: ({ children }: { children: React.ReactNode; className?: string }) => (
		<div>{children}</div>
	),
	ItemDescription: ({ children }: { children: React.ReactNode; className?: string }) => (
		<p>{children}</p>
	),
	ItemGroup: ({
		children,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
	}) => <div aria-label={ariaLabel}>{children}</div>,
	ItemTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...rest }: { children: React.ReactNode; [key: string]: unknown }) => (
		<button {...rest}>{children}</button>
	),
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
	default: ({
		children,
		href,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		href: string;
		"aria-label"?: string;
	}) => (
		<a href={href} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	Sparkles: () => <svg data-testid="icon-sparkles" />,
	StickyNote: () => <svg data-testid="icon-sticky-note" aria-label="Notes internes" />,
	Paperclip: () => <svg data-testid="icon-paperclip" aria-hidden="true" />,
}));

import { CustomizationsMobileList } from "../customizations-mobile-list";
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
				<CustomizationsMobileList requestsPromise={promise} perPage={perPage} />
			</React.Suspense>,
		);
	});
}

function makeResult(
	overrides: Partial<GetCustomizationRequestsResult> = {},
): GetCustomizationRequestsResult {
	return {
		items: [],
		pagination: { nextCursor: null, prevCursor: null, hasNextPage: false, hasPreviousPage: false },
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationsMobileList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders empty state when no requests", async () => {
		await renderWithSuspense(makeResult());
		expect(screen.getByText("Aucune demande trouvée")).toBeInTheDocument();
	});

	it("renders the reset filters link in empty state", async () => {
		await renderWithSuspense(makeResult());
		expect(screen.getByRole("link", { name: "Réinitialiser les filtres" })).toBeInTheDocument();
	});

	it("renders item group with accessible label", async () => {
		await renderWithSuspense(makeResult({ items: [createRequest()] }));
		expect(screen.getByLabelText("Demandes de personnalisation")).toBeInTheDocument();
	});

	it("renders client name as a link", async () => {
		await renderWithSuspense(makeResult({ items: [createRequest({ firstName: "Marie" })] }));
		expect(screen.getByRole("link", { name: "Voir la demande de Marie" })).toBeInTheDocument();
	});

	it("renders client email and product type", async () => {
		await renderWithSuspense(
			makeResult({
				items: [createRequest({ email: "marie@example.com", productTypeLabel: "Bague" })],
			}),
		);
		expect(screen.getByText("marie@example.com")).toBeInTheDocument();
		expect(screen.getByText("Bague")).toBeInTheDocument();
	});

	it("shows paperclip icon when inspiration products exist", async () => {
		await renderWithSuspense(
			makeResult({ items: [createRequest({ _count: { inspirationProducts: 2 } })] }),
		);
		expect(screen.getByTestId("icon-paperclip")).toBeInTheDocument();
	});

	it("shows sticky note icon when adminNotes is set", async () => {
		await renderWithSuspense(
			makeResult({ items: [createRequest({ adminNotes: "Private note" })] }),
		);
		expect(screen.getByTestId("icon-sticky-note")).toBeInTheDocument();
	});

	it("renders cursor pagination", async () => {
		await renderWithSuspense(makeResult({ items: [createRequest()] }));
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders UpdateNotesDialog", async () => {
		await renderWithSuspense(makeResult({ items: [createRequest()] }));
		expect(screen.getByTestId("update-notes-dialog")).toBeInTheDocument();
	});
});
