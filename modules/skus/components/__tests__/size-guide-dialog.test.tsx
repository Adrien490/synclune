import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockResponsiveDialogTrigger, mockResponsiveDialogContent } = vi.hoisted(() => ({
	mockResponsiveDialogTrigger: vi.fn(),
	mockResponsiveDialogContent: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTrigger: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => {
		mockResponsiveDialogTrigger({ asChild });
		return <div data-testid="dialog-trigger">{children}</div>;
	},
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => {
		mockResponsiveDialogContent();
		return <div data-testid="dialog-content">{children}</div>;
	},
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-title">{children}</div>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/tabs", () => ({
	Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => (
		<div data-testid="tabs" data-default-value={defaultValue}>
			{children}
		</div>
	),
	TabsList: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tabs-list">{children}</div>
	),
	TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<button data-testid={`tab-trigger-${value}`}>{children}</button>
	),
	TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid={`tab-content-${value}`}>{children}</div>
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { SizeGuideDialog } from "../size-guide-dialog";

// ============================================================================
// TEARDOWN
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("SizeGuideDialog", () => {
	describe("trigger button", () => {
		it("renders at least one element with text 'Guide des tailles'", () => {
			render(<SizeGuideDialog />);

			// Text appears in both the trigger button and the dialog title
			const elements = screen.getAllByText("Guide des tailles");

			expect(elements.length).toBeGreaterThanOrEqual(1);
		});

		it("renders the trigger inside ResponsiveDialogTrigger", () => {
			render(<SizeGuideDialog />);

			expect(screen.getByTestId("dialog-trigger")).toBeInTheDocument();
		});

		it("renders custom children as trigger when provided", () => {
			render(
				<SizeGuideDialog>
					<button type="button">Mon déclencheur</button>
				</SizeGuideDialog>,
			);

			expect(screen.getByText("Mon déclencheur")).toBeInTheDocument();
		});

		it("renders a button of type 'button' with Ruler icon as default trigger", () => {
			render(<SizeGuideDialog />);

			const trigger = screen.getByTestId("dialog-trigger");
			const button = trigger.querySelector("button[type='button']");

			expect(button).toBeInTheDocument();
		});
	});

	describe("dialog content", () => {
		it("renders the dialog content container", () => {
			render(<SizeGuideDialog />);

			expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
		});

		it("renders the dialog title 'Guide des tailles'", () => {
			render(<SizeGuideDialog />);

			expect(screen.getByTestId("dialog-title")).toBeInTheDocument();
		});

		it("renders tab triggers for rings and bracelets", () => {
			render(<SizeGuideDialog />);

			expect(screen.getByTestId("tab-trigger-rings")).toBeInTheDocument();
			expect(screen.getByTestId("tab-trigger-bracelets")).toBeInTheDocument();
		});

		it("renders tab content for rings and bracelets", () => {
			render(<SizeGuideDialog />);

			expect(screen.getByTestId("tab-content-rings")).toBeInTheDocument();
			expect(screen.getByTestId("tab-content-bracelets")).toBeInTheDocument();
		});
	});

	describe("default tab based on productTypeSlug", () => {
		it("defaults to 'rings' tab when productTypeSlug includes 'ring'", () => {
			render(<SizeGuideDialog productTypeSlug="rings" />);

			const tabs = screen.getByTestId("tabs");

			expect(tabs).toHaveAttribute("data-default-value", "rings");
		});

		it("defaults to 'bracelets' tab when productTypeSlug includes 'bracelet'", () => {
			render(<SizeGuideDialog productTypeSlug="bracelets" />);

			const tabs = screen.getByTestId("tabs");

			expect(tabs).toHaveAttribute("data-default-value", "bracelets");
		});

		it("defaults to 'rings' tab when no productTypeSlug provided", () => {
			render(<SizeGuideDialog />);

			const tabs = screen.getByTestId("tabs");

			expect(tabs).toHaveAttribute("data-default-value", "rings");
		});
	});
});
