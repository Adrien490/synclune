import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const { usePathnameMock, useBottomBarHeightMock } = vi.hoisted(() => ({
	usePathnameMock: vi.fn(() => "/compte"),
	useBottomBarHeightMock: vi.fn(),
}));

// Mock cn utility
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
	usePathname: usePathnameMock,
}));

// Mock next/link — render as plain <a>
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

// Mock motion/react
vi.mock("motion/react", () => ({
	useReducedMotion: vi.fn(() => false),
	motion: { div: "div", nav: "nav" },
}));

// Mock useBottomBarHeight
vi.mock("@/shared/hooks", () => ({
	useBottomBarHeight: useBottomBarHeightMock,
}));

// Mock motion config
vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { spring: { bar: { damping: 25, stiffness: 300 } } },
}));

// Mock LogoutAlertDialog
vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="logout-dialog">{children}</div>
	),
}));

import { AccountNav } from "../account-nav";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	usePathnameMock.mockReturnValue("/compte");
});

// ---------------------------------------------------------------------------
// Rendering variants
// ---------------------------------------------------------------------------

describe("AccountNav variants", () => {
	it("renders both desktop and mobile by default (full variant)", () => {
		render(<AccountNav />);

		// Both desktop and mobile navs share the same aria-label
		const navs = screen.getAllByRole("navigation", {
			name: "Navigation espace client",
		});
		expect(navs).toHaveLength(2);

		// Desktop aside exists
		const aside = document.querySelector("aside");
		expect(aside).not.toBeNull();
	});

	it('renders only desktop when variant="desktop-only"', () => {
		render(<AccountNav variant="desktop-only" />);

		const aside = document.querySelector("aside");
		expect(aside).not.toBeNull();

		// Bottom bar should not be registered as enabled
		expect(useBottomBarHeightMock).not.toHaveBeenCalled();
	});

	it('renders only mobile when variant="mobile-only"', () => {
		render(<AccountNav variant="mobile-only" />);

		const aside = document.querySelector("aside");
		expect(aside).toBeNull();

		// Bottom bar should be enabled
		expect(useBottomBarHeightMock).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Desktop nav accessibility
// ---------------------------------------------------------------------------

describe("Desktop nav accessibility", () => {
	it("has aria-label on the nav element", () => {
		render(<AccountNav variant="desktop-only" />);

		const nav = screen.getByRole("navigation", {
			name: "Navigation espace client",
		});
		expect(nav).toBeDefined();
	});

	it("is wrapped in an aside element", () => {
		render(<AccountNav variant="desktop-only" />);

		const aside = document.querySelector("aside");
		expect(aside).not.toBeNull();
		expect(aside?.querySelector("nav")).not.toBeNull();
	});

	it("has aria-current=page on the active link", () => {
		usePathnameMock.mockReturnValue("/compte");
		render(<AccountNav variant="desktop-only" />);

		const activeLink = screen.getByRole("link", { name: /Tableau de bord/i });
		expect(activeLink.getAttribute("aria-current")).toBe("page");
	});

	it("does not set aria-current on inactive links", () => {
		usePathnameMock.mockReturnValue("/compte");
		render(<AccountNav variant="desktop-only" />);

		const inactiveLink = screen.getByRole("link", { name: /Commandes/i });
		expect(inactiveLink.getAttribute("aria-current")).toBeNull();
	});

	it("renders icons with aria-hidden on all nav items", () => {
		render(<AccountNav variant="desktop-only" />);

		const hiddenIcons = document.querySelectorAll('[aria-hidden="true"]');
		// 6 nav items + 1 logout icon = 7
		expect(hiddenIcons.length).toBeGreaterThanOrEqual(7);
	});

	it("has a logout button with type=button", () => {
		render(<AccountNav variant="desktop-only" />);

		const logoutBtn = screen.getByRole("button", {
			name: /Se déconnecter/i,
		});
		expect(logoutBtn.getAttribute("type")).toBe("button");
	});
});

// ---------------------------------------------------------------------------
// isActive logic
// ---------------------------------------------------------------------------

describe("isActive logic", () => {
	it("marks /compte as active only on exact match", () => {
		usePathnameMock.mockReturnValue("/compte");
		render(<AccountNav variant="desktop-only" />);

		const dashboardLink = screen.getByRole("link", {
			name: /Tableau de bord/i,
		});
		expect(dashboardLink.getAttribute("aria-current")).toBe("page");
	});

	it("does not mark /compte as active on /commandes", () => {
		usePathnameMock.mockReturnValue("/commandes");
		render(<AccountNav variant="desktop-only" />);

		const dashboardLink = screen.getByRole("link", {
			name: /Tableau de bord/i,
		});
		expect(dashboardLink.getAttribute("aria-current")).toBeNull();
	});

	it("marks /commandes as active on /commandes/order-123", () => {
		usePathnameMock.mockReturnValue("/commandes/order-123");
		render(<AccountNav variant="desktop-only" />);

		const ordersLink = screen.getByRole("link", { name: /Commandes/i });
		expect(ordersLink.getAttribute("aria-current")).toBe("page");
	});

	it("marks /mes-avis as active on exact match", () => {
		usePathnameMock.mockReturnValue("/mes-avis");
		render(<AccountNav variant="desktop-only" />);

		const reviewsLink = screen.getByRole("link", { name: /Mes avis/i });
		expect(reviewsLink.getAttribute("aria-current")).toBe("page");
	});

	it("marks /parametres as active", () => {
		usePathnameMock.mockReturnValue("/parametres");
		render(<AccountNav variant="desktop-only" />);

		const settingsLink = screen.getByRole("link", { name: /Paramètres/i });
		expect(settingsLink.getAttribute("aria-current")).toBe("page");
	});
});

// ---------------------------------------------------------------------------
// Desktop items (all 6 rendered)
// ---------------------------------------------------------------------------

describe("Desktop nav items", () => {
	it("renders all 6 nav items including desktopOnly", () => {
		render(<AccountNav variant="desktop-only" />);

		const links = screen.getAllByRole("link");
		expect(links).toHaveLength(6);
	});

	it("renders Adresses (desktopOnly item)", () => {
		render(<AccountNav variant="desktop-only" />);

		expect(screen.getByRole("link", { name: /Adresses/i })).toBeDefined();
	});

	it("renders Mes demandes (desktopOnly item)", () => {
		render(<AccountNav variant="desktop-only" />);

		expect(
			screen.getByRole("link", { name: /Mes demandes/i })
		).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Mobile items (desktopOnly filtered out)
// ---------------------------------------------------------------------------

describe("Mobile nav items", () => {
	it("renders only non-desktopOnly items in mobile", () => {
		render(<AccountNav variant="mobile-only" />);

		const links = screen.getAllByRole("link");
		// 4 items: Accueil, Commandes, Mes avis, Parametres
		expect(links).toHaveLength(4);
	});

	it("does not render Adresses in mobile", () => {
		render(<AccountNav variant="mobile-only" />);

		expect(screen.queryByText("Adresses")).toBeNull();
	});

	it("does not render Mes demandes in mobile", () => {
		render(<AccountNav variant="mobile-only" />);

		expect(screen.queryByText("Mes demandes")).toBeNull();
	});

	it("uses mobileLabel for Tableau de bord", () => {
		render(<AccountNav variant="mobile-only" />);

		expect(screen.getByText("Accueil")).toBeDefined();
		expect(screen.queryByText("Tableau de bord")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Visual consistency (border-l-2 on all items)
// ---------------------------------------------------------------------------

describe("Visual consistency", () => {
	it("active item has border-primary class", () => {
		usePathnameMock.mockReturnValue("/compte");
		render(<AccountNav variant="desktop-only" />);

		const activeLink = screen.getByRole("link", { name: /Tableau de bord/i });
		expect(activeLink.className).toContain("border-primary");
	});

	it("inactive item has border-transparent class", () => {
		usePathnameMock.mockReturnValue("/compte");
		render(<AccountNav variant="desktop-only" />);

		const inactiveLink = screen.getByRole("link", { name: /Commandes/i });
		expect(inactiveLink.className).toContain("border-transparent");
	});

	it("all desktop links have border-l-2", () => {
		render(<AccountNav variant="desktop-only" />);

		const links = screen.getAllByRole("link");
		for (const link of links) {
			expect(link.className).toContain("border-l-2");
		}
	});
});
