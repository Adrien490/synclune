import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("lucide-react", () => ({
	ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-icon" {...props} />,
}));

// Import AFTER mocks
import { AdminMenuCollapsibleGroup } from "../admin-menu-collapsible-group";
import type { NavGroup } from "../navigation-config";

// ============================================================================
// TEST DATA
// ============================================================================

const MockIcon = ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
	<svg data-testid="nav-icon" className={className} {...props} />
);

const mockGroup: NavGroup = {
	label: "Catalogue",
	icon: MockIcon as never,
	collapsible: true,
	items: [
		{
			id: "products",
			title: "Produits",
			url: "/admin/catalogue/produits",
			icon: MockIcon as never,
		},
		{
			id: "collections",
			title: "Collections",
			url: "/admin/catalogue/collections",
			icon: MockIcon as never,
		},
		{
			id: "product-types",
			title: "Types de produits",
			shortTitle: "Types",
			url: "/admin/catalogue/types-de-produits",
			icon: MockIcon as never,
		},
	],
};

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

describe("AdminMenuCollapsibleGroup", () => {
	describe("collapsed state", () => {
		it("is collapsed by default when no active item", () => {
			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin" />);

			// Group label visible
			expect(screen.getByText("Catalogue")).toBeInTheDocument();
			// Items should not be in the DOM (Radix removes collapsed content)
			expect(screen.queryByText("Produits")).not.toBeInTheDocument();
		});

		it("is expanded by default when an item is active", () => {
			mockIsRouteActive.mockImplementation(
				(_: string, url: string) => url === "/admin/catalogue/produits",
			);

			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin/catalogue/produits" />);

			expect(screen.getByText("Produits")).toBeVisible();
			expect(screen.getByText("Collections")).toBeVisible();
		});
	});

	describe("toggle behavior", () => {
		it("expands when clicking the group header", () => {
			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin" />);

			fireEvent.click(screen.getByText("Catalogue"));

			expect(screen.getByText("Produits")).toBeVisible();
			expect(screen.getByText("Collections")).toBeVisible();
		});

		it("collapses when clicking the group header again", () => {
			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin" />);

			// Open
			fireEvent.click(screen.getByText("Catalogue"));
			expect(screen.getByText("Produits")).toBeInTheDocument();

			// Close
			fireEvent.click(screen.getByText("Catalogue"));
			expect(screen.queryByText("Produits")).not.toBeInTheDocument();
		});
	});

	describe("navigation items", () => {
		it("renders correct number of items", () => {
			mockIsRouteActive.mockImplementation(
				(_: string, url: string) => url === "/admin/catalogue/produits",
			);

			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin/catalogue/produits" />);

			expect(screen.getAllByRole("link")).toHaveLength(3);
		});

		it("renders shortTitle when available", () => {
			mockIsRouteActive.mockImplementation(
				(_: string, url: string) => url === "/admin/catalogue/produits",
			);

			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin/catalogue/produits" />);

			expect(screen.getByText("Types")).toBeInTheDocument();
			expect(screen.queryByText("Types de produits")).not.toBeInTheDocument();
		});

		it('sets aria-current="page" on active item', () => {
			mockIsRouteActive.mockImplementation(
				(_: string, url: string) => url === "/admin/catalogue/produits",
			);

			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin/catalogue/produits" />);

			const activeLink = screen.getByRole("link", { name: /Produits/ });
			expect(activeLink).toHaveAttribute("aria-current", "page");

			const inactiveLink = screen.getByRole("link", { name: /Collections/ });
			expect(inactiveLink).not.toHaveAttribute("aria-current");
		});
	});

	describe("accessibility", () => {
		it("has a group with aria-labelledby", () => {
			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin" />);

			const group = screen.getByRole("group");
			expect(group).toHaveAttribute("aria-labelledby", "mobile-nav-catalogue");
		});

		it("renders chevron icon", () => {
			render(<AdminMenuCollapsibleGroup group={mockGroup} pathname="/admin" />);

			expect(screen.getByTestId("chevron-icon")).toBeInTheDocument();
		});
	});

	describe("badges", () => {
		it("renders badge count on item", () => {
			mockIsRouteActive.mockImplementation(
				(_: string, url: string) => url === "/admin/catalogue/produits",
			);

			render(
				<AdminMenuCollapsibleGroup
					group={mockGroup}
					pathname="/admin/catalogue/produits"
					badges={{ products: 7 }}
				/>,
			);

			expect(screen.getByText("7")).toBeInTheDocument();
			expect(screen.getByLabelText("7 en attente")).toBeInTheDocument();
		});

		it("renders 99+ for counts over 99", () => {
			mockIsRouteActive.mockImplementation(
				(_: string, url: string) => url === "/admin/catalogue/produits",
			);

			render(
				<AdminMenuCollapsibleGroup
					group={mockGroup}
					pathname="/admin/catalogue/produits"
					badges={{ products: 200 }}
				/>,
			);

			expect(screen.getByText("99+")).toBeInTheDocument();
		});

		it("does not render badge when count is 0", () => {
			mockIsRouteActive.mockImplementation(
				(_: string, url: string) => url === "/admin/catalogue/produits",
			);

			render(
				<AdminMenuCollapsibleGroup
					group={mockGroup}
					pathname="/admin/catalogue/produits"
					badges={{ products: 0 }}
				/>,
			);

			expect(screen.queryByLabelText(/en attente/)).not.toBeInTheDocument();
		});
	});
});
