import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ResponsiveDialog", () => {
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

	it("forwards className to DialogContent", () => {
		render(<FullDialog className="max-w-lg flex-col p-4 sm:max-w-xl" />);

		const content = screen.getByTestId("dialog-content");
		expect(content.className).toContain("p-4");
		expect(content.className).toContain("flex-col");
		expect(content.className).toContain("max-w-lg");
		expect(content.className).toContain("sm:max-w-xl");
	});

	it("passes open and onOpenChange to the underlying Dialog", () => {
		const onOpenChange = vi.fn();
		render(
			<ResponsiveDialog open={true} onOpenChange={onOpenChange}>
				<ResponsiveDialogContent>Content</ResponsiveDialogContent>
			</ResponsiveDialog>,
		);

		expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
	});
});
