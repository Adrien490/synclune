import type * as ReactModule from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPathname, mockPush, mockStartTransition, mockIsPending, mockTriggerHaptic } =
	vi.hoisted(() => {
		const mockStartTransition = vi.fn((cb: () => void) => cb());
		const mockIsPending = { value: false };

		return {
			mockPathname: { value: "/commandes" },
			mockPush: vi.fn(),
			mockStartTransition,
			mockIsPending,
			mockTriggerHaptic: vi.fn(),
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

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
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

const getMobileNav = (container: HTMLElement) =>
	container.querySelector("nav.lg\\:hidden") as HTMLElement | null;

const getDesktopNav = (container: HTMLElement) =>
	container.querySelector("nav.hidden.lg\\:block") as HTMLElement | null;

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
			expect(getDesktopNav(container)).not.toBeNull();
		});

		it("renders 3 desktop tab links: Commandes, Adresses, Parametres", () => {
			render(<AccountTabsNav />);
			const allLinks = screen.getAllByRole("link");
			const labels = allLinks.map((l) => l.textContent);
			expect(labels.filter((l) => l.includes("Commandes")).length).toBeGreaterThanOrEqual(1);
			expect(labels.filter((l) => l.includes("Adresses")).length).toBeGreaterThanOrEqual(1);
			expect(labels.filter((l) => l.includes("Paramètres")).length).toBeGreaterThanOrEqual(1);
		});

		it("desktop links point to the correct hrefs", () => {
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
			expect(hrefs).toContain("/commandes");
			expect(hrefs).toContain("/adresses");
			expect(hrefs).toContain("/parametres");
		});
	});

	describe("Mobile sticky top nav rendering", () => {
		it("renders a mobile nav with lg:hidden class", () => {
			const { container } = render(<AccountTabsNav />);
			expect(getMobileNav(container)).not.toBeNull();
		});

		it("applies sticky top positioning classes", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			expect(mobileNav.className).toContain("sticky");
			expect(mobileNav.className).toContain("top-[calc(");
			expect(mobileNav.className).toContain("z-30");
		});

		it("uses backdrop-blur and border-b for the sticky strip", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			expect(mobileNav.className).toContain("backdrop-blur-md");
			expect(mobileNav.className).toContain("border-b");
		});

		it("extends full-bleed via -mx-4 sm:-mx-6", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			expect(mobileNav.className).toContain("-mx-4");
			expect(mobileNav.className).toContain("sm:-mx-6");
		});

		it("renders an inner toolbar with role='toolbar'", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const toolbar = mobileNav.querySelector("[role='toolbar']");
			expect(toolbar).not.toBeNull();
			expect(toolbar?.getAttribute("aria-orientation")).toBe("horizontal");
		});

		it("renders 3 links inside the mobile nav", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			expect(links).toHaveLength(3);
		});

		it("mobile links point to correct hrefs", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
			expect(hrefs).toContain("/commandes");
			expect(hrefs).toContain("/adresses");
			expect(hrefs).toContain("/parametres");
		});

		it("renders mobile labels Commandes/Adresses/Paramètres", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const labels = Array.from(mobileNav.querySelectorAll("a span")).map((s) => s.textContent);
			expect(labels).toContain("Commandes");
			expect(labels).toContain("Adresses");
			expect(labels).toContain("Paramètres");
		});

		it("renders an icon (svg) per mobile link with aria-hidden", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const svgs = mobileNav.querySelectorAll("svg");
			expect(svgs).toHaveLength(3);
			svgs.forEach((svg) => {
				expect(svg.getAttribute("aria-hidden")).toBe("true");
			});
		});

		it("applies min-h-11 for WCAG 2.5.5 touch targets", () => {
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			links.forEach((link) => {
				expect(link.className).toContain("min-h-11");
			});
		});
	});

	describe("Active state via pathname", () => {
		it("sets aria-current='page' on the active desktop link when on /commandes", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			const activeLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes");
			expect(activeLink?.getAttribute("aria-current")).toBe("page");
		});

		it("sets aria-current='page' on the active mobile link when on /adresses", () => {
			mockPathname.value = "/adresses";
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			const activeLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses");
			expect(activeLink?.getAttribute("aria-current")).toBe("page");
		});

		it("matches via startsWith — pathname /commandes/123 activates ORDERS link", () => {
			mockPathname.value = "/commandes/123";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			const ordersLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes");
			expect(ordersLink?.getAttribute("aria-current")).toBe("page");
		});

		it("does not set aria-current on inactive desktop links", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			const inactiveLinks = Array.from(links).filter(
				(l) => l.getAttribute("href") !== "/commandes",
			);
			inactiveLinks.forEach((link) => {
				expect(link.getAttribute("aria-current")).toBeNull();
			});
		});
	});

	describe("Active state styling", () => {
		it("applies text-foreground to the active mobile link", () => {
			mockPathname.value = "/adresses";
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			const activeLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses");
			expect(activeLink?.className).toContain("text-foreground");
		});

		it("renders the active dot only on the active mobile link", () => {
			mockPathname.value = "/parametres";
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const dots = mobileNav.querySelectorAll("span.bg-primary.rounded-full");
			expect(dots).toHaveLength(1);
			const activeLink = Array.from(mobileNav.querySelectorAll("a")).find(
				(l) => l.getAttribute("href") === "/parametres",
			);
			expect(activeLink?.querySelector("span.bg-primary.rounded-full")).not.toBeNull();
		});

		it("renders no dot when no mobile link is active", () => {
			mockPathname.value = "/autre-page";
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const dots = mobileNav.querySelectorAll("span.bg-primary.rounded-full");
			expect(dots).toHaveLength(0);
		});

		it("applies active border class to the active desktop link", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			const activeLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes");
			expect(activeLink?.className).toContain("text-foreground");
			expect(activeLink?.className).toContain("border-primary");
		});

		it("applies muted class to inactive desktop links", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
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
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			links.forEach((link) => {
				expect(link.className).toContain("pointer-events-none");
				expect(link.className).toContain("opacity-70");
			});
		});

		it("applies pointer-events-none and opacity-70 to mobile links when isPending=true", () => {
			mockIsPending.value = true;
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			links.forEach((link) => {
				expect(link.className).toContain("pointer-events-none");
				expect(link.className).toContain("opacity-70");
			});
		});

		it("does not apply pending classes when isPending=false", () => {
			mockIsPending.value = false;
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
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
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			const adressesLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses")!;

			fireEvent.click(adressesLink);

			expect(mockPush).toHaveBeenCalledWith("/adresses");
			expect(mockStartTransition).toHaveBeenCalledTimes(1);
		});

		it("triggers haptic feedback when navigating to an inactive link", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			const adressesLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses")!;

			fireEvent.click(adressesLink);

			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
			expect(mockTriggerHaptic).toHaveBeenCalledTimes(1);
		});

		it("does NOT call router.push when clicking the already-active link", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			const commandesLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes")!;

			fireEvent.click(commandesLink);

			expect(mockPush).not.toHaveBeenCalled();
			expect(mockStartTransition).not.toHaveBeenCalled();
		});

		it("does NOT trigger haptic when clicking the already-active link", () => {
			mockPathname.value = "/adresses";
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			const adressesLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses")!;

			fireEvent.click(adressesLink);

			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});

		it("does NOT call router.push when clicking active link on a sub-path", () => {
			mockPathname.value = "/commandes/abc-123";
			const { container } = render(<AccountTabsNav />);
			const desktopNav = getDesktopNav(container)!;
			const links = desktopNav.querySelectorAll("a");
			const commandesLink = Array.from(links).find((l) => l.getAttribute("href") === "/commandes")!;

			fireEvent.click(commandesLink);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("navigates to /parametres from mobile sticky nav when inactive", () => {
			mockPathname.value = "/commandes";
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			const parametresLink = Array.from(links).find(
				(l) => l.getAttribute("href") === "/parametres",
			)!;

			fireEvent.click(parametresLink);

			expect(mockPush).toHaveBeenCalledWith("/parametres");
		});

		it("does not navigate when clicking active mobile link", () => {
			mockPathname.value = "/adresses";
			const { container } = render(<AccountTabsNav />);
			const mobileNav = getMobileNav(container)!;
			const links = mobileNav.querySelectorAll("a");
			const adressesLink = Array.from(links).find((l) => l.getAttribute("href") === "/adresses")!;

			fireEvent.click(adressesLink);

			expect(mockPush).not.toHaveBeenCalled();
		});
	});
});
