import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsRouteActive } = vi.hoisted(() => ({
	mockIsRouteActive: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/lib/navigation", () => ({
	isRouteActive: mockIsRouteActive,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Import AFTER mocks
import { AdminMenuQuickAccess } from "../admin-menu-quick-access";
import type { NavItem } from "../navigation-config";

// ============================================================================
// TEST DATA
// ============================================================================

const MockIcon = ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
	<svg data-testid="mock-icon" className={className} {...props} />
);

const mockItems: NavItem[] = [
	{
		id: "dashboard",
		title: "Tableau de bord",
		shortTitle: "Accueil",
		url: "/admin",
		icon: MockIcon as never,
	},
	{ id: "orders", title: "Commandes", url: "/admin/ventes/commandes", icon: MockIcon as never },
	{ id: "products", title: "Produits", url: "/admin/catalogue/produits", icon: MockIcon as never },
];

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	mockIsRouteActive.mockReturnValue(false);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("AdminMenuQuickAccess", () => {
	describe("rendering", () => {
		it("renders 3 quick access links", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" />);

			expect(screen.getAllByRole("link")).toHaveLength(3);
		});

		it("renders shortTitle when available", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" />);

			expect(screen.getByText("Accueil")).toBeInTheDocument();
		});

		it("renders full title when shortTitle is not available", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" />);

			expect(screen.getByText("Commandes")).toBeInTheDocument();
			expect(screen.getByText("Produits")).toBeInTheDocument();
		});

		it("renders correct href for each link", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" />);

			const links = screen.getAllByRole("link");
			expect(links[0]).toHaveAttribute("href", "/admin");
			expect(links[1]).toHaveAttribute("href", "/admin/ventes/commandes");
			expect(links[2]).toHaveAttribute("href", "/admin/catalogue/produits");
		});

		it("renders section heading", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" />);

			expect(screen.getByText("Accès rapide")).toBeInTheDocument();
		});

		it("returns null when items is empty", () => {
			const { container } = render(<AdminMenuQuickAccess items={[]} pathname="/admin" />);

			expect(container.innerHTML).toBe("");
		});
	});

	describe("active state", () => {
		it('sets aria-current="page" on active item', () => {
			mockIsRouteActive.mockImplementation((_: string, url: string) => url === "/admin");

			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" />);

			const links = screen.getAllByRole("link");
			expect(links[0]).toHaveAttribute("aria-current", "page");
			expect(links[1]).not.toHaveAttribute("aria-current");
			expect(links[2]).not.toHaveAttribute("aria-current");
		});
	});

	describe("badges", () => {
		it("renders badge count when provided", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" badges={{ orders: 5 }} />);

			expect(screen.getByText("5")).toBeInTheDocument();
		});

		it("renders 99+ for counts over 99", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" badges={{ orders: 150 }} />);

			expect(screen.getByText("99+")).toBeInTheDocument();
		});

		it("does not render badge when count is 0", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" badges={{ orders: 0 }} />);

			expect(screen.queryByLabelText(/en attente/)).not.toBeInTheDocument();
		});

		it("does not render badge when badges prop is undefined", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" />);

			expect(screen.queryByLabelText(/en attente/)).not.toBeInTheDocument();
		});

		it("badge has aria-label with count", () => {
			render(<AdminMenuQuickAccess items={mockItems} pathname="/admin" badges={{ orders: 3 }} />);

			expect(screen.getByLabelText("3 en attente")).toBeInTheDocument();
		});
	});
});
