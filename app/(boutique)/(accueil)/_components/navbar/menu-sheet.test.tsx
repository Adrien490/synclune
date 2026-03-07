import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Stub window.matchMedia (needed by useEdgeSwipe)
beforeAll(() => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: query === "(min-width: 1024px)",
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
});

// Mock next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock motion/react — pass-through rendering
vi.mock("motion/react", () => {
	const handler = {
		get(_target: Record<string, unknown>, prop: string) {
			// Return a component that renders the HTML element with non-motion props
			return function MotionProxy({
				children,
				animate: _animate,
				initial: _initial,
				exit: _exit,
				custom: _custom,
				variants: _variants,
				transition: _transition,
				...rest
			}: Record<string, unknown>) {
				const El = prop as unknown as React.ElementType;
				return <El {...rest}>{children as React.ReactNode}</El>;
			};
		},
	};
	return {
		motion: new Proxy({} as Record<string, unknown>, handler),
		useReducedMotion: () => false,
		AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	};
});

// Mock Sheet components
vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
	SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SheetContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sheet-content">{children}</div>
	),
	SheetHeader: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div {...props}>{children}</div>
	),
	SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ScrollFade
vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock LogoutAlertDialog to avoid transitive font imports
vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: () => null,
}));

// Mock sub-components
vi.mock("./menu-sheet-nav", () => ({
	MenuSheetNav: () => <div data-testid="menu-sheet-nav" />,
}));

vi.mock("./menu-sheet-footer", () => ({
	MenuSheetFooter: ({ isAdmin }: { isAdmin: boolean }) => (
		<div data-testid="menu-sheet-footer" data-admin={isAdmin} />
	),
}));

// Mock useDialog
const mockOpen = vi.fn();
const mockClose = vi.fn();
vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: false,
		open: mockOpen,
		close: mockClose,
	}),
}));

import { MenuSheet } from "./menu-sheet";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const baseProps = {
	navItems: [{ href: "/", label: "Accueil", icon: "home" as const }],
	productTypes: [{ slug: "bagues", label: "Bagues" }],
	collections: [] as Array<{
		slug: string;
		label: string;
		images: Array<{ url: string; blurDataUrl: string | null; alt: string | null }>;
		createdAt?: Date;
	}>,
	isAdmin: false,
	session: null,
};

describe("MenuSheet", () => {
	describe("trigger button", () => {
		it("renders a trigger button with correct aria attributes when closed", () => {
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: "Ouvrir le menu de navigation" });
			expect(trigger).toBeInTheDocument();
			expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
			expect(trigger.getAttribute("aria-expanded")).toBe("false");
		});

		it("is hidden on desktop (lg:hidden class)", () => {
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: /menu de navigation/ });
			expect(trigger.className).toContain("lg:hidden");
		});
	});

	describe("sheet structure", () => {
		it("renders sr-only sheet header with title and description", () => {
			render(<MenuSheet {...baseProps} />);

			expect(screen.getByText("Menu de navigation")).toBeInTheDocument();
			expect(screen.getByText(/Découvrez nos bijoux et collections/)).toBeInTheDocument();
		});

		it("passes isAdmin to footer", () => {
			render(<MenuSheet {...baseProps} isAdmin />);

			const footer = screen.getByTestId("menu-sheet-footer");
			expect(footer.getAttribute("data-admin")).toBe("true");
		});

		it("renders nav component", () => {
			render(<MenuSheet {...baseProps} />);

			expect(screen.getByTestId("menu-sheet-nav")).toBeInTheDocument();
		});
	});

	describe("hamburger icon", () => {
		it("renders an SVG icon inside the trigger with aria-hidden", () => {
			render(<MenuSheet {...baseProps} />);

			const trigger = screen.getByRole("button", { name: /menu de navigation/ });
			const svg = trigger.querySelector("svg");
			expect(svg).not.toBeNull();
			expect(svg?.getAttribute("aria-hidden")).toBe("true");
		});
	});
});
