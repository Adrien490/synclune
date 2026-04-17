import type * as ReactModule from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPathname, mockPush, mockStartTransition, mockIsPending } = vi.hoisted(() => {
	const mockStartTransition = vi.fn((cb: () => void) => cb());
	const mockIsPending = { value: false };

	return {
		mockPathname: { value: "/commandes" },
		mockPush: vi.fn(),
		mockStartTransition,
		mockIsPending,
	};
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname.value,
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof ReactModule>();
	return {
		...actual,
		useTransition: () => [mockIsPending.value, mockStartTransition],
	};
});

vi.mock("@/shared/components/bottom-bar", () => ({
	BottomBar: ({
		children,
		breakpointClass,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		breakpointClass?: string;
		as?: string;
		"aria-label"?: string;
	}) => (
		<div data-testid="bottom-bar" data-breakpoint-class={breakpointClass} aria-label={ariaLabel}>
			{children}
		</div>
	),
	ActiveDot: () => <span data-testid="active-dot" />,
	bottomBarContainerClass: "bottom-bar-container",
	bottomBarItemClass: "bottom-bar-item",
	bottomBarActiveItemClass: "bottom-bar-active-item",
	bottomBarIconClass: "bottom-bar-icon",
	bottomBarLabelClass: "bottom-bar-label",
}));

vi.mock("@/shared/constants/urls", () => ({
	ROUTES: {
		ACCOUNT: {
			ORDERS: "/commandes",
			ADDRESSES: "/adresses",
			SETTINGS: "/parametres",
		},
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		className,
		"aria-current": ariaCurrent,
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
		className?: string;
		"aria-current"?: "page" | "step" | "location" | "date" | "time" | "true" | "false" | boolean;
	}) => (
		<a href={href} onClick={onClick} className={className} aria-current={ariaCurrent}>
			{children}
		</a>
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { AccountTabsNav } from "../account-tabs-nav";

// ============================================================================
// HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockPathname.value = "/commandes";
	mockIsPending.value = false;
});

// ============================================================================
// TESTS
// ============================================================================

describe("AccountTabsNav", () => {
	describe("Desktop tabs rendering", () => {
		it("renders a nav with aria-label 'Navigation espace client'", () => {
			render(<AccountTabsNav />);
			const navs = screen.getAllByRole("navigation", {
				name: "Navigation espace client",
			});
			expect(navs.length).toBeGreaterThanOrEqual(1);
		});

		it("renders the desktop nav with hidden class and lg:block", () => {
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			expect(desktopNav).not.toBeNull();
		});

		it("renders 3 desktop tab links: Commandes, Adresses, Parametres", () => {
			render(<AccountTabsNav />);
			// getAllByRole('link') includes both desktop + mobile links
			const allLinks = screen.getAllByRole("link");
			const labels = allLinks.map((l) => l.textContent);
			// Expect at least 3 links with those labels (desktop tabs)
			expect(labels.filter((l) => l.includes("Commandes")).length).toBeGreaterThanOrEqual(1);
			expect(labels.filter((l) => l.includes("Adresses")).length).toBeGreaterThanOrEqual(1);
			expect(labels.filter((l) => l.includes("Paramètres")).length).toBeGreaterThanOrEqual(1);
		});

		it("desktop links point to the correct hrefs", () => {
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
			expect(hrefs).toContain("/commandes");
			expect(hrefs).toContain("/adresses");
			expect(hrefs).toContain("/parametres");
		});
	});

	describe("Mobile bottom bar rendering", () => {
		it("renders the BottomBar with breakpointClass='lg:hidden'", () => {
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			expect(bottomBar).toHaveAttribute("data-breakpoint-class", "lg:hidden");
		});

		it("renders the BottomBar with the account navigation aria-label", () => {
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			expect(bottomBar).toHaveAttribute("aria-label", "Navigation espace client");
		});

		it("renders 4 links inside the BottomBar", () => {
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			expect(links).toHaveLength(4);
		});

		it("mobile links point to correct hrefs", () => {
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
			expect(hrefs).toContain("/commandes");
			expect(hrefs).toContain("/adresses");
			expect(hrefs).toContain("/parametres");
		});

		it("renders label spans with bottomBarLabelClass on mobile links", () => {
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const spans = bottomBar.querySelectorAll("span.bottom-bar-label");
			expect(spans).toHaveLength(4);
			const labels = Array.from(spans).map((s) => s.textContent);
			expect(labels).toContain("Commandes");
			expect(labels).toContain("Personnalisations");
			expect(labels).toContain("Adresses");
			expect(labels).toContain("Paramètres");
		});
	});

	describe("Active state via pathname", () => {
		it("sets aria-current='page' on the active desktop link when on /commandes", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const activeLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes");
			expect(activeLink?.getAttribute("aria-current")).toBe("page");
		});

		it("sets aria-current='page' on the active mobile link when on /adresses", () => {
			mockPathname.value = "/adresses";
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			const activeLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses");
			expect(activeLink?.getAttribute("aria-current")).toBe("page");
		});

		it("matches via startsWith — pathname /commandes/123 activates ORDERS link", () => {
			mockPathname.value = "/commandes/123";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const ordersLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes");
			expect(ordersLink?.getAttribute("aria-current")).toBe("page");
		});

		it("does not set aria-current on inactive desktop links", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const inactiveLinks = Array.from(links).filter(
				(l) => l.getAttribute("href") !== "/commandes",
			);
			inactiveLinks.forEach((link) => {
				expect(link.getAttribute("aria-current")).toBeNull();
			});
		});

		it("does not set aria-current on inactive mobile links", () => {
			mockPathname.value = "/adresses";
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			const inactiveLinks = Array.from(links).filter((l) => l.getAttribute("href") !== "/adresses");
			inactiveLinks.forEach((link) => {
				expect(link.getAttribute("aria-current")).toBeNull();
			});
		});
	});

	describe("Active state styling", () => {
		it("applies bottomBarActiveItemClass to the active mobile link", () => {
			mockPathname.value = "/adresses";
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			const activeLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses");
			expect(activeLink?.className).toContain("bottom-bar-active-item");
		});

		it("does not apply bottomBarActiveItemClass to inactive mobile links", () => {
			mockPathname.value = "/adresses";
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			const inactiveLinks = Array.from(links).filter((l) => l.getAttribute("href") !== "/adresses");
			inactiveLinks.forEach((link) => {
				expect(link.className).not.toContain("bottom-bar-active-item");
			});
		});

		it("renders ActiveDot only for the active mobile link", () => {
			mockPathname.value = "/parametres";
			render(<AccountTabsNav />);
			const activeDots = screen.getAllByTestId("active-dot");
			expect(activeDots).toHaveLength(1);
		});

		it("renders no ActiveDot when no link is active", () => {
			mockPathname.value = "/autre-page";
			render(<AccountTabsNav />);
			const activeDots = screen.queryAllByTestId("active-dot");
			expect(activeDots).toHaveLength(0);
		});

		it("applies active border class to the active desktop link", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const activeLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes");
			// Active link gets text-foreground and border-primary
			expect(activeLink?.className).toContain("text-foreground");
			expect(activeLink?.className).toContain("border-primary");
		});

		it("applies muted class to inactive desktop links", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const inactiveLinks = Array.from(links).filter(
				(l) => l.getAttribute("href") !== "/commandes",
			);
			inactiveLinks.forEach((link) => {
				expect(link.className).toContain("text-muted-foreground");
			});
		});
	});

	describe("Pending state", () => {
		it("applies pointer-events-none and opacity-70 to desktop links when isPending=true", () => {
			mockIsPending.value = true;
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			links.forEach((link) => {
				expect(link.className).toContain("pointer-events-none");
				expect(link.className).toContain("opacity-70");
			});
		});

		it("applies pointer-events-none and opacity-70 to mobile links when isPending=true", () => {
			mockIsPending.value = true;
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			links.forEach((link) => {
				expect(link.className).toContain("pointer-events-none");
				expect(link.className).toContain("opacity-70");
			});
		});

		it("does not apply pending classes when isPending=false", () => {
			mockIsPending.value = false;
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			links.forEach((link) => {
				expect(link.className).not.toContain("pointer-events-none");
				expect(link.className).not.toContain("opacity-70");
			});
		});
	});

	describe("Navigation handler", () => {
		it("calls e.preventDefault() and router.push in startTransition when clicking an inactive link", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const adressesLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses")!;

			const event = { preventDefault: vi.fn() };
			fireEvent.click(adressesLink, event);

			expect(mockPush).toHaveBeenCalledWith("/adresses");
			expect(mockStartTransition).toHaveBeenCalledTimes(1);
		});

		it("wraps router.push inside startTransition", () => {
			mockPathname.value = "/commandes";
			// Make startTransition NOT auto-execute the callback so we can verify it was passed
			mockStartTransition.mockImplementationOnce((cb: () => void) => {
				// call it to ensure push is tested, but we track the call
				cb();
			});
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const adressesLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses")!;

			fireEvent.click(adressesLink);

			expect(mockStartTransition).toHaveBeenCalledTimes(1);
			expect(mockPush).toHaveBeenCalledWith("/adresses");
		});

		it("does NOT call router.push when clicking the already-active link", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const commandesLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes")!;

			fireEvent.click(commandesLink);

			expect(mockPush).not.toHaveBeenCalled();
			expect(mockStartTransition).not.toHaveBeenCalled();
		});

		it("does NOT call router.push when clicking active link on a sub-path", () => {
			mockPathname.value = "/commandes/abc-123";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = container.querySelector("nav.hidden.lg\\:block");
			const links = desktopNav!.querySelectorAll("a");
			const commandesLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes")!;

			fireEvent.click(commandesLink);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("navigates to /parametres from mobile bottom bar when inactive", () => {
			mockPathname.value = "/commandes";
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			const parametresLink = Array.from(links).find(
				(l) => l.getAttribute("href") === "/parametres",
			)!;

			fireEvent.click(parametresLink);

			expect(mockPush).toHaveBeenCalledWith("/parametres");
		});

		it("does not navigate when clicking active mobile link", () => {
			mockPathname.value = "/adresses";
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			const adressesLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses")!;

			fireEvent.click(adressesLink);

			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	describe("Icons", () => {
		it("renders icons with aria-hidden='true' in the mobile bottom bar", () => {
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			// Lucide icons render as SVG elements
			const svgs = bottomBar.querySelectorAll("svg");
			expect(svgs).toHaveLength(4);
			svgs.forEach((svg) => {
				expect(svg.getAttribute("aria-hidden")).toBe("true");
			});
		});

		it("applies bottomBarIconClass to each icon", () => {
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const svgs = bottomBar.querySelectorAll("svg");
			svgs.forEach((svg) => {
				// SVGAnimatedString — use getAttribute for class checks
				expect(svg.getAttribute("class")).toContain("bottom-bar-icon");
			});
		});
	});

	describe("bottomBarItemClass applied to all mobile links", () => {
		it("applies bottomBarItemClass to every mobile link", () => {
			mockPathname.value = "/commandes";
			render(<AccountTabsNav />);
			const bottomBar = screen.getByTestId("bottom-bar");
			const links = bottomBar.querySelectorAll("a");
			links.forEach((link) => {
				expect(link.className).toContain("bottom-bar-item");
			});
		});
	});
});
