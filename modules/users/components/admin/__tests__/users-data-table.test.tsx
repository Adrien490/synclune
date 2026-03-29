import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUse } = vi.hoisted(() => ({
	mockUse: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("react")>();
	return { ...actual, use: mockUse };
});

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: ({
		hasNextPage,
		hasPreviousPage,
	}: {
		perPage: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		currentPageSize: number;
		nextCursor?: string | null;
		prevCursor?: string | null;
	}) => (
		<div
			data-testid="cursor-pagination"
			data-has-next={hasNextPage}
			data-has-prev={hasPreviousPage}
		/>
	),
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
		action?: { label: string; href: string };
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
	TableHead: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children?: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<th className={className} aria-label={ariaLabel}>
			{children}
		</th>
	),
	TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
	TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<tr className={className}>{children}</tr>
	),
}));

vi.mock("@/shared/components/table-selection-cell", () => ({
	TableSelectionCell: ({
		type,
		itemId,
	}: {
		type: "header" | "row";
		itemId?: string;
		itemIds?: string[];
	}) => (
		<input
			type="checkbox"
			data-testid={type === "header" ? "select-all" : `select-row-${itemId}`}
		/>
	),
}));

vi.mock("@/modules/users/components/admin/users-row-actions", () => ({
	UsersRowActions: ({ user }: { user: { id: string; name: string } }) => (
		<div data-testid={`row-actions-${user.id}`} />
	),
}));

vi.mock("@/modules/users/components/admin/users-selection-toolbar", () => ({
	UsersSelectionToolbar: ({ userIds }: { userIds: string[] }) => (
		<div data-testid="selection-toolbar" data-count={userIds.length} />
	),
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
		className?: string;
	}) => (
		<a href={href} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: vi.fn((_date: Date) => "01/01/2026"),
}));

vi.mock("lucide-react", () => ({
	CircleCheck: ({
		"aria-label": ariaLabel,
		className: _className,
	}: {
		"aria-label"?: string;
		className?: string;
	}) => <svg data-testid="icon-circle-check" aria-label={ariaLabel} />,
	Users: () => <svg data-testid="icon-users" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { UsersDataTable } from "../users-data-table";

// ============================================================================
// HELPERS
// ============================================================================

function createUser(overrides: Record<string, unknown> = {}) {
	return {
		id: "user-1",
		name: "Alice Dupont",
		email: "alice@example.com",
		role: "USER" as const,
		emailVerified: true,
		deletedAt: null,
		suspendedAt: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date(),
		accountStatus: "ACTIVE" as const,
		_count: { orders: 0, sessions: 0, accounts: 0 },
		...overrides,
	};
}

function createPagination(overrides: Record<string, unknown> = {}) {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		nextCursor: null,
		prevCursor: null,
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

describe("UsersDataTable", () => {
	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when users array is empty", () => {
		mockUse.mockReturnValue({ users: [], pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users: [], pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
	});

	it("shows 'Aucun client trouvé' in empty state", () => {
		mockUse.mockReturnValue({ users: [], pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users: [], pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByText("Aucun client trouvé")).toBeInTheDocument();
	});

	it("empty state shows reset link when resetHref is provided", () => {
		mockUse.mockReturnValue({ users: [], pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users: [], pagination: createPagination() })}
				perPage={20}
				resetHref="/admin/clients"
			/>,
		);
		expect(screen.getByTestId("table-empty-state")).toBeInTheDocument();
	});

	// ─── With data ────────────────────────────────────────────────────────────

	it("renders a table card when users exist", () => {
		const users = [createUser()];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByTestId("card")).toBeInTheDocument();
	});

	it("renders user name in the table", () => {
		const users = [createUser({ name: "Alice Dupont" })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
	});

	it("renders user email in the table", () => {
		const users = [createUser({ email: "alice@example.com" })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByText("alice@example.com")).toBeInTheDocument();
	});

	it("renders email verified icon when emailVerified is true", () => {
		const users = [createUser({ emailVerified: true })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByTestId("icon-circle-check")).toBeInTheDocument();
	});

	it("does not render email verified icon when emailVerified is false", () => {
		const users = [createUser({ emailVerified: false })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.queryByTestId("icon-circle-check")).toBeNull();
	});

	it("shows order count as a link when orderCount > 0", () => {
		const users = [createUser({ _count: { orders: 5, sessions: 0, accounts: 0 } })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByRole("link", { name: /5 commande/i })).toBeInTheDocument();
	});

	it("shows '0' without link when orderCount is 0", () => {
		const users = [createUser({ _count: { orders: 0, sessions: 0, accounts: 0 } })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /commande/i })).toBeNull();
	});

	it("applies opacity-50 class to deleted user rows", () => {
		const users = [createUser({ deletedAt: new Date() })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		const rows = document.querySelectorAll("tr");
		const deletedRow = Array.from(rows).find((r) => r.className.includes("opacity-50"));
		expect(deletedRow).not.toBeUndefined();
	});

	it("uses 'Utilisateur' as display name when name is null", () => {
		const users = [createUser({ name: null })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByText("Utilisateur")).toBeInTheDocument();
	});

	it("renders row actions for each user", () => {
		const users = [createUser({ id: "user-99" })];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByTestId("row-actions-user-99")).toBeInTheDocument();
	});

	it("renders cursor pagination", () => {
		const users = [createUser()];
		mockUse.mockReturnValue({ users, pagination: createPagination() });
		render(
			<UsersDataTable
				usersPromise={Promise.resolve({ users, pagination: createPagination() })}
				perPage={20}
			/>,
		);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});
});
