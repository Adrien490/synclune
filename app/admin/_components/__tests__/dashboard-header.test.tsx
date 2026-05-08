import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("lucide-react", () => ({
	ExternalLink: (props: Record<string, unknown>) => (
		<svg data-testid="external-link-icon" {...props} />
	),
	Keyboard: (props: Record<string, unknown>) => <svg data-testid="keyboard-icon" {...props} />,
}));

vi.mock("@/app/admin/_components/keyboard-shortcuts-dialog", () => ({
	KEYBOARD_SHORTCUTS_DIALOG_ID: "admin-keyboard-shortcuts",
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: false,
		open: vi.fn(),
		close: vi.fn(),
		toggle: vi.fn(),
		clearData: vi.fn(),
	}),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		target,
		rel,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		target?: string;
		rel?: string;
		"aria-label"?: string;
		className?: string;
	}) => (
		<a href={href} target={target} rel={rel} aria-label={ariaLabel} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/app/admin/_components/dashboard-breadcrumb", () => ({
	DashboardBreadcrumb: () => <nav data-testid="dashboard-breadcrumb" />,
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: ({ orientation, className }: { orientation?: string; className?: string }) => (
		<hr data-testid="separator" data-orientation={orientation} className={className} />
	),
}));

vi.mock("@/shared/components/ui/kbd", () => ({
	Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
	KbdGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span className={className}>{children}</span>
	),
}));

vi.mock("@/shared/components/ui/sidebar", () => ({
	SidebarTrigger: ({ className }: { className?: string }) => (
		<button data-testid="sidebar-trigger" className={className}>
			Toggle
		</button>
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	TooltipContent: ({
		children,
		side,
	}: {
		children: React.ReactNode;
		side?: string;
		sideOffset?: number;
	}) => (
		<div data-testid="tooltip-content" data-side={side}>
			{children}
		</div>
	),
	TooltipTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div>{children}</div>,
}));

import { DashboardHeader } from "../dashboard-header";

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

describe("DashboardHeader", () => {
	describe("accessibility", () => {
		it('renders header with role="banner"', () => {
			render(<DashboardHeader />);
			expect(screen.getByRole("banner")).toBeInTheDocument();
		});

		it("renders header with correct aria-label", () => {
			render(<DashboardHeader />);
			expect(screen.getByRole("banner")).toHaveAttribute(
				"aria-label",
				"En-tête du tableau de bord",
			);
		});
	});

	describe("sidebar trigger", () => {
		it("renders sidebar trigger button", () => {
			render(<DashboardHeader />);
			expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument();
		});

		it("shows keyboard shortcut in tooltip", () => {
			render(<DashboardHeader />);
			expect(screen.getByText("Basculer le menu")).toBeInTheDocument();
			expect(screen.getByText("⌘")).toBeInTheDocument();
			expect(screen.getByText("B")).toBeInTheDocument();
		});
	});

	describe("breadcrumb", () => {
		it("renders DashboardBreadcrumb", () => {
			render(<DashboardHeader />);
			expect(screen.getByTestId("dashboard-breadcrumb")).toBeInTheDocument();
		});
	});

	describe("external link", () => {
		it("renders link to home page", () => {
			render(<DashboardHeader />);
			const link = screen.getByLabelText("Voir le site (nouvel onglet)");
			expect(link).toHaveAttribute("href", "/");
		});

		it("opens in new tab", () => {
			render(<DashboardHeader />);
			const link = screen.getByLabelText("Voir le site (nouvel onglet)");
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		});

		it("shows tooltip text", () => {
			render(<DashboardHeader />);
			expect(screen.getByText("Voir le site")).toBeInTheDocument();
		});

		it("renders external link icon with aria-hidden", () => {
			render(<DashboardHeader />);
			expect(screen.getByTestId("external-link-icon")).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("separator", () => {
		it("renders vertical separator", () => {
			render(<DashboardHeader />);
			const separator = screen.getByTestId("separator");
			expect(separator).toHaveAttribute("data-orientation", "vertical");
		});
	});
});
