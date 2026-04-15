import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: {
		CONFIRMED: "CONFIRMED",
		PENDING: "PENDING",
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
}));

vi.mock("@/modules/newsletter/constants/newsletter-status.constants", () => ({
	NEWSLETTER_STATUS_LABELS: {
		CONFIRMED: "Confirmé",
		PENDING: "En attente",
		UNSUBSCRIBED: "Désabonné",
	},
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/shared/components/table-scroll-container", () => ({
	TableScrollContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="table-scroll-container">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
}));

vi.mock("@/shared/components/data-table/table-empty-state", () => ({
	TableEmptyState: ({
		title,
		description,
	}: {
		icon: unknown;
		title: string;
		description: string;
		actionElement?: React.ReactNode;
	}) => (
		<div data-testid="table-empty-state">
			<p>{title}</p>
			<p>{description}</p>
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
	TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<td className={className}>{children}</td>
	),
	TableHead: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
		<th className={className}>{children}</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		variant,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
	}) => (asChild ? <>{children}</> : <button data-variant={variant}>{children}</button>),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: vi.fn(() => "01/01/2026"),
}));

vi.mock("lucide-react", () => ({
	CircleCheck: ({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) => (
		<svg data-testid="icon-circle-check" aria-hidden={ariaHidden} />
	),
	Clock: ({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) => (
		<svg data-testid="icon-clock" aria-hidden={ariaHidden} />
	),
	Mail: () => <svg data-testid="icon-mail" />,
	CircleX: ({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) => (
		<svg data-testid="icon-circle-x" aria-hidden={ariaHidden} />
	),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("../newsletter-selection-toolbar", () => ({
	NewsletterSelectionToolbar: () => <div data-testid="newsletter-selection-toolbar" />,
}));

vi.mock("../subscriber-row-actions", () => ({
	SubscriberRowActions: () => <div data-testid="subscriber-row-actions" />,
}));

vi.mock("@/shared/components/item-checkbox", () => ({
	ItemCheckbox: () => <input type="checkbox" data-testid="item-checkbox" />,
}));

vi.mock("@/shared/components/select-all-checkbox", () => ({
	SelectAllCheckbox: () => <input type="checkbox" data-testid="select-all-checkbox" />,
}));

import { Suspense } from "react";
import { act } from "@testing-library/react";
import { SubscribersDataTable } from "../subscribers-data-table";

// ============================================================================
// HELPERS
// ============================================================================

function createPagination(overrides = {}) {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		nextCursor: null,
		prevCursor: null,
		...overrides,
	};
}

function createSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub-1",
		email: "test@example.com",
		status: "CONFIRMED" as const,
		subscribedAt: new Date("2026-01-01"),
		unsubscribedAt: null as Date | null,
		confirmedAt: null as Date | null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-15"),
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	vi.clearAllMocks();
});

async function renderTable(
	subscribersPromise: Promise<{
		subscribers: ReturnType<typeof createSubscriber>[];
		pagination: ReturnType<typeof createPagination>;
	}>,
	perPage = 20,
) {
	await act(async () => {
		render(
			<Suspense fallback={<div>Loading...</div>}>
				<SubscribersDataTable subscribersPromise={subscribersPromise} perPage={perPage} />
			</Suspense>,
		);
	});
}

describe("SubscribersDataTable", () => {
	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when no subscribers", async () => {
		await renderTable(Promise.resolve({ subscribers: [], pagination: createPagination() }));
		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
	});

	it("shows 'Aucun abonné trouvé' in empty state", async () => {
		await renderTable(Promise.resolve({ subscribers: [], pagination: createPagination() }));
		expect(screen.getByText("Aucun abonné trouvé")).toBeInTheDocument();
	});

	// ─── With data ────────────────────────────────────────────────────────────

	it("renders a card when subscribers exist", async () => {
		const subscribers = [createSubscriber()];
		await renderTable(Promise.resolve({ subscribers, pagination: createPagination() }));
		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	it("renders subscriber email", async () => {
		const subscribers = [createSubscriber({ email: "subscriber@example.com" })];
		await renderTable(Promise.resolve({ subscribers, pagination: createPagination() }));
		expect(screen.getByText("subscriber@example.com")).toBeInTheDocument();
	});

	it("renders 'Confirmé' status for CONFIRMED subscribers", async () => {
		const subscribers = [createSubscriber({ status: "CONFIRMED" })];
		await renderTable(Promise.resolve({ subscribers, pagination: createPagination() }));
		expect(screen.getByText("Confirmé")).toBeInTheDocument();
		expect(screen.getByTestId("icon-circle-check")).toBeInTheDocument();
	});

	it("renders 'En attente' status for PENDING subscribers", async () => {
		const subscribers = [createSubscriber({ status: "PENDING" })];
		await renderTable(Promise.resolve({ subscribers, pagination: createPagination() }));
		expect(screen.getByText("En attente")).toBeInTheDocument();
		expect(screen.getByTestId("icon-clock")).toBeInTheDocument();
	});

	it("renders 'Désabonné' status for UNSUBSCRIBED subscribers", async () => {
		const subscribers = [createSubscriber({ status: "UNSUBSCRIBED" })];
		await renderTable(Promise.resolve({ subscribers, pagination: createPagination() }));
		expect(screen.getByText("Désabonné")).toBeInTheDocument();
		expect(screen.getByTestId("icon-circle-x")).toBeInTheDocument();
	});

	it("renders cursor pagination", async () => {
		const subscribers = [createSubscriber()];
		await renderTable(Promise.resolve({ subscribers, pagination: createPagination() }));
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders table with correct aria-label", async () => {
		const subscribers = [createSubscriber()];
		await renderTable(Promise.resolve({ subscribers, pagination: createPagination() }));
		expect(
			screen.getByRole("table", { name: /Liste des abonnés newsletter/i }),
		).toBeInTheDocument();
	});

	it("renders multiple subscribers", async () => {
		const subscribers = [
			createSubscriber({ id: "sub-1", email: "a@example.com" }),
			createSubscriber({ id: "sub-2", email: "b@example.com" }),
		];
		await renderTable(Promise.resolve({ subscribers, pagination: createPagination() }));
		expect(screen.getByText("a@example.com")).toBeInTheDocument();
		expect(screen.getByText("b@example.com")).toBeInTheDocument();
	});
});
