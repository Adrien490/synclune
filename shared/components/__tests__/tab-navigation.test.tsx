import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		prefetch: _p,
		...props
	}: Record<string, unknown> & { children?: unknown; href: string }) => {
		const { createElement } = require("react");
		return createElement("a", { href, ...props }, children);
	},
}));

vi.mock("lucide-react", () => {
	const { createElement } = require("react");
	return {
		CheckIcon: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "check-icon", ...props }),
		ChevronDownIcon: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "chevron-down", ...props }),
	};
});

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{
				children,
				variant: _v,
				size: _s,
				...props
			}: Record<string, unknown> & { children?: unknown },
			ref: unknown,
		) => createElement("button", { ref, ...props }, children),
	);
	Button.displayName = "Button";
	return { Button };
});

vi.mock("@/shared/components/ui/drawer", () => {
	const { createElement } = require("react");
	return {
		Drawer: ({
			children,
			open,
		}: {
			children: unknown;
			open: boolean;
			onOpenChange: (v: boolean) => void;
		}) => (open ? createElement("div", { "data-testid": "drawer" }, children) : null),
		DrawerContent: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-content", ...props }, children),
		DrawerHandle: () => null,
		DrawerHeader: ({ children }: { children: unknown }) =>
			createElement("div", { "data-testid": "drawer-header" }, children),
		DrawerTitle: ({ children }: { children: unknown }) =>
			createElement("div", { "data-testid": "drawer-title" }, children),
		DrawerBody: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-body", ...props }, children),
	};
});

// Import AFTER mocks
import { TabNavigation } from "../tab-navigation";
import type { TabNavigationItem } from "@/shared/types/component.types";

// ============================================================================
// HELPERS
// ============================================================================

const ITEMS: TabNavigationItem[] = [
	{ label: "Bracelets", value: "bracelets", href: "/bracelets" },
	{ label: "Bagues", value: "bagues", href: "/bagues" },
	{ label: "Colliers", value: "colliers", href: "/colliers" },
	{ label: "Boucles", value: "boucles", href: "/boucles" },
];

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("TabNavigation", () => {
	it("returns null for empty items", () => {
		const { container } = render(<TabNavigation items={[]} />);

		expect(container.innerHTML).toBe("");
	});

	it("renders a nav element with aria-label", () => {
		render(<TabNavigation items={ITEMS} />);

		expect(screen.getByRole("navigation", { name: "Navigation principale" })).toBeInTheDocument();
	});

	it("renders custom ariaLabel", () => {
		render(<TabNavigation items={ITEMS} ariaLabel="Catégories" />);

		expect(screen.getByRole("navigation", { name: "Catégories" })).toBeInTheDocument();
	});

	it("renders all items as links", () => {
		render(<TabNavigation items={ITEMS} />);

		const links = screen.getAllByRole("link");
		expect(links).toHaveLength(4);
		expect(links[0]).toHaveAttribute("href", "/bracelets");
		expect(links[0]).toHaveTextContent("Bracelets");
	});

	it("marks active item with aria-current='page'", () => {
		render(<TabNavigation items={ITEMS} activeValue="colliers" />);

		const activeLinks = screen.getAllByText("Colliers").map((el) => el.closest("a"));
		const withAriaCurrent = activeLinks.find((a) => a?.getAttribute("aria-current") === "page");
		expect(withAriaCurrent).toBeDefined();
	});

	it("does not mark inactive items with aria-current", () => {
		render(<TabNavigation items={ITEMS} activeValue="colliers" />);

		const inactiveLink = screen.getAllByText("Bracelets")[0]!.closest("a");
		expect(inactiveLink).not.toHaveAttribute("aria-current");
	});

	describe("overflow behavior (mobileVisibleCount)", () => {
		it("applies hidden md:inline-flex to overflow items", () => {
			render(<TabNavigation items={ITEMS} mobileVisibleCount={2} />);

			const colliersLink = screen.getByText("Colliers").closest("a");
			expect(colliersLink!.className).toContain("hidden md:inline-flex");
		});

		it("does not apply hidden class to visible items", () => {
			render(<TabNavigation items={ITEMS} mobileVisibleCount={2} />);

			const braceletsLink = screen.getByText("Bracelets").closest("a");
			expect(braceletsLink!.className).not.toContain("hidden");
		});

		it("renders 'Plus' button with aria-haspopup when overflow exists", () => {
			render(<TabNavigation items={ITEMS} mobileVisibleCount={2} />);

			const plusBtn = screen.getByRole("button", { name: "Plus d'options de navigation" });
			expect(plusBtn).toBeInTheDocument();
			expect(plusBtn).toHaveAttribute("aria-haspopup", "dialog");
		});

		it("does not render 'Plus' button when all items fit", () => {
			render(<TabNavigation items={ITEMS} mobileVisibleCount={4} />);

			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		});

		it("shows active overflow item label on 'Plus' button", () => {
			render(<TabNavigation items={ITEMS} activeValue="colliers" mobileVisibleCount={2} />);

			const plusBtn = screen.getByRole("button", { name: "Plus d'options de navigation" });
			expect(plusBtn).toHaveTextContent("Colliers");
		});

		it("shows 'Plus' text when no overflow item is active", () => {
			render(<TabNavigation items={ITEMS} activeValue="bracelets" mobileVisibleCount={2} />);

			const plusBtn = screen.getByRole("button", { name: "Plus d'options de navigation" });
			expect(plusBtn).toHaveTextContent("Plus");
		});
	});

	describe("drawer", () => {
		it("opens drawer when Plus button is clicked", () => {
			render(<TabNavigation items={ITEMS} mobileVisibleCount={2} />);

			expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Plus d'options de navigation" }));

			expect(screen.getByTestId("drawer")).toBeInTheDocument();
		});

		it("renders all items in the drawer", () => {
			render(<TabNavigation items={ITEMS} mobileVisibleCount={2} />);
			fireEvent.click(screen.getByRole("button", { name: "Plus d'options de navigation" }));

			const drawerBody = screen.getByTestId("drawer-body");
			const drawerLinks = drawerBody.querySelectorAll("a");
			expect(drawerLinks).toHaveLength(4);
		});

		it("uses custom panelTitle in drawer", () => {
			render(
				<TabNavigation items={ITEMS} mobileVisibleCount={2} panelTitle="Choisir une catégorie" />,
			);
			fireEvent.click(screen.getByRole("button", { name: "Plus d'options de navigation" }));

			expect(screen.getByTestId("drawer-title")).toHaveTextContent("Choisir une catégorie");
		});

		it("uses default panelTitle when not provided", () => {
			render(<TabNavigation items={ITEMS} mobileVisibleCount={2} />);
			fireEvent.click(screen.getByRole("button", { name: "Plus d'options de navigation" }));

			expect(screen.getByTestId("drawer-title")).toHaveTextContent("Parcourir par type");
		});

		it("renders CheckIcon on active item in drawer", () => {
			render(<TabNavigation items={ITEMS} activeValue="bagues" mobileVisibleCount={2} />);
			fireEvent.click(screen.getByRole("button", { name: "Plus d'options de navigation" }));

			expect(screen.getByTestId("check-icon")).toBeInTheDocument();
		});
	});
});
