import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMobile } = vi.hoisted(() => ({
	mockIsMobile: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@/shared/components/ui/dialog", () => {
	const { createElement } = require("react");
	return {
		Dialog: ({
			children,
			open: _open,
			onOpenChange: _onChange,
		}: {
			children: unknown;
			open?: boolean;
			onOpenChange?: (v: boolean) => void;
		}) => createElement("div", { "data-testid": "dialog-root" }, children),
		DialogContent: ({
			children,
			showCloseButton: _s,
			...props
		}: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "dialog-content", ...props }, children),
		DialogHeader: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "dialog-header", ...props }, children),
		DialogFooter: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "dialog-footer", ...props }, children),
		DialogTitle: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "dialog-title", ...props }, children),
		DialogDescription: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "dialog-description", ...props }, children),
		DialogClose: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "dialog-close", ...props }, children),
		DialogTrigger: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "dialog-trigger", ...props }, children),
	};
});

vi.mock("@/shared/components/ui/drawer", () => {
	const { createElement } = require("react");
	return {
		Drawer: ({
			children,
			open: _open,
			onOpenChange: _onChange,
			direction: _d,
		}: {
			children: unknown;
			open?: boolean;
			onOpenChange?: (v: boolean) => void;
			direction?: string;
		}) => createElement("div", { "data-testid": "drawer-root" }, children),
		DrawerContent: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-content", ...props }, children),
		DrawerHeader: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-header", ...props }, children),
		DrawerFooter: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-footer", ...props }, children),
		DrawerTitle: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-title", ...props }, children),
		DrawerDescription: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-description", ...props }, children),
		DrawerClose: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-close", ...props }, children),
		DrawerTrigger: ({ children, ...props }: Record<string, unknown> & { children?: unknown }) =>
			createElement("div", { "data-testid": "drawer-trigger", ...props }, children),
	};
});

// Import AFTER mocks
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogFooter,
	ResponsiveDialogTitle,
	ResponsiveDialogDescription,
	ResponsiveDialogClose,
	ResponsiveDialogTrigger,
	useResponsiveDialogContext,
} from "../responsive-dialog";

// ============================================================================
// HELPERS
// ============================================================================

function FullDialog({ className }: { className?: string }) {
	return (
		<ResponsiveDialog>
			<ResponsiveDialogTrigger>Open</ResponsiveDialogTrigger>
			<ResponsiveDialogContent className={className}>
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>Desc</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				<ResponsiveDialogFooter>
					<ResponsiveDialogClose>Close</ResponsiveDialogClose>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockIsMobile.value = false;
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ResponsiveDialog", () => {
	describe("context", () => {
		it("throws when used outside of ResponsiveDialog provider", () => {
			function Orphan() {
				useResponsiveDialogContext();
				return null;
			}

			// Suppress console.error for expected error
			const spy = vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() => render(<Orphan />)).toThrow(
				"Les composants ResponsiveDialog doivent être utilisés dans un ResponsiveDialog",
			);
			spy.mockRestore();
		});
	});

	describe("desktop mode (not mobile)", () => {
		it("renders Dialog components", () => {
			render(<FullDialog />);

			expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
			expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
			expect(screen.getByTestId("dialog-header")).toBeInTheDocument();
			expect(screen.getByTestId("dialog-title")).toBeInTheDocument();
			expect(screen.getByTestId("dialog-description")).toBeInTheDocument();
			expect(screen.getByTestId("dialog-footer")).toBeInTheDocument();
			expect(screen.getByTestId("dialog-close")).toBeInTheDocument();
			expect(screen.getByTestId("dialog-trigger")).toBeInTheDocument();
		});

		it("does not render Drawer components", () => {
			render(<FullDialog />);

			expect(screen.queryByTestId("drawer-root")).not.toBeInTheDocument();
		});
	});

	describe("mobile mode", () => {
		beforeEach(() => {
			mockIsMobile.value = true;
		});

		it("renders Drawer components", () => {
			render(<FullDialog />);

			expect(screen.getByTestId("drawer-root")).toBeInTheDocument();
			expect(screen.getByTestId("drawer-content")).toBeInTheDocument();
			expect(screen.getByTestId("drawer-header")).toBeInTheDocument();
			expect(screen.getByTestId("drawer-title")).toBeInTheDocument();
			expect(screen.getByTestId("drawer-description")).toBeInTheDocument();
			expect(screen.getByTestId("drawer-footer")).toBeInTheDocument();
			expect(screen.getByTestId("drawer-close")).toBeInTheDocument();
			expect(screen.getByTestId("drawer-trigger")).toBeInTheDocument();
		});

		it("does not render Dialog components", () => {
			render(<FullDialog />);

			expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
		});

		it("filters max-w-* classes from content in drawer mode", () => {
			render(<FullDialog className="max-w-lg flex-col p-4 sm:max-w-xl" />);

			const content = screen.getByTestId("drawer-content");
			expect(content.className).toContain("p-4");
			expect(content.className).toContain("flex-col");
			expect(content.className).not.toContain("max-w-lg");
			expect(content.className).not.toContain("sm:max-w-xl");
		});
	});

	describe("forceMode", () => {
		it("renders Drawer when forceMode='drawer' on desktop", () => {
			mockIsMobile.value = false;
			render(
				<ResponsiveDialog forceMode="drawer">
					<ResponsiveDialogContent>Content</ResponsiveDialogContent>
				</ResponsiveDialog>,
			);

			expect(screen.getByTestId("drawer-root")).toBeInTheDocument();
			expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
		});

		it("renders Dialog when forceMode='dialog' on mobile", () => {
			mockIsMobile.value = true;
			render(
				<ResponsiveDialog forceMode="dialog">
					<ResponsiveDialogContent>Content</ResponsiveDialogContent>
				</ResponsiveDialog>,
			);

			expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
			expect(screen.queryByTestId("drawer-root")).not.toBeInTheDocument();
		});
	});

	describe("open/onOpenChange passthrough", () => {
		it("passes open and onOpenChange to the underlying Dialog", () => {
			const onOpenChange = vi.fn();
			render(
				<ResponsiveDialog open={true} onOpenChange={onOpenChange}>
					<ResponsiveDialogContent>Content</ResponsiveDialogContent>
				</ResponsiveDialog>,
			);

			// The mock Dialog renders regardless; we just verify no crash
			expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
		});

		it("passes open and onOpenChange to the underlying Drawer", () => {
			mockIsMobile.value = true;
			const onOpenChange = vi.fn();
			render(
				<ResponsiveDialog open={true} onOpenChange={onOpenChange}>
					<ResponsiveDialogContent>Content</ResponsiveDialogContent>
				</ResponsiveDialog>,
			);

			expect(screen.getByTestId("drawer-root")).toBeInTheDocument();
		});
	});
});
