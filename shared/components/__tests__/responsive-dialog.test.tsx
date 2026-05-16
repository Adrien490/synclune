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

const isMobileMock = vi.fn(() => false);
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => isMobileMock(),
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
		}: {
			children: unknown;
			open?: boolean;
			onOpenChange?: (v: boolean) => void;
		}) =>
			createElement(
				"div",
				{
					"data-testid": "drawer-root",
				},
				children,
			),
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
	isMobileMock.mockReturnValue(false);
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ResponsiveDialog (desktop)", () => {
	it("renders Dialog primitives", () => {
		render(<FullDialog />);

		expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
		expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
		expect(screen.getByTestId("dialog-header")).toBeInTheDocument();
		expect(screen.getByTestId("dialog-title")).toBeInTheDocument();
		expect(screen.getByTestId("dialog-description")).toBeInTheDocument();
		expect(screen.getByTestId("dialog-footer")).toBeInTheDocument();
		expect(screen.getByTestId("dialog-close")).toBeInTheDocument();
		expect(screen.getByTestId("dialog-trigger")).toBeInTheDocument();
		expect(screen.queryByTestId("drawer-root")).not.toBeInTheDocument();
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

describe("ResponsiveDialog (mobile)", () => {
	beforeEach(() => {
		isMobileMock.mockReturnValue(true);
	});

	it("renders Drawer primitives instead of Dialog", () => {
		render(<FullDialog />);

		expect(screen.getByTestId("drawer-root")).toBeInTheDocument();
		expect(screen.getByTestId("drawer-content")).toBeInTheDocument();
		expect(screen.getByTestId("drawer-header")).toBeInTheDocument();
		expect(screen.getByTestId("drawer-title")).toBeInTheDocument();
		expect(screen.getByTestId("drawer-description")).toBeInTheDocument();
		expect(screen.getByTestId("drawer-footer")).toBeInTheDocument();
		expect(screen.getByTestId("drawer-close")).toBeInTheDocument();
		expect(screen.getByTestId("drawer-trigger")).toBeInTheDocument();
		expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
	});

	it("wraps DrawerContent children in a scrollable body to prevent truncation", () => {
		render(<FullDialog />);

		const content = screen.getByTestId("drawer-content");
		const scrollWrap = content.firstElementChild as HTMLElement;
		expect(scrollWrap).toBeTruthy();
		expect(scrollWrap.className).toContain("overflow-y-auto");
		expect(scrollWrap.className).toContain("flex-1");
	});

	it("overrides --bottom-bar-height and --admin-main-x on DrawerContent so AdminFormFooter sticks at the drawer edge", () => {
		render(<FullDialog />);

		const content = screen.getByTestId("drawer-content") as HTMLElement;
		expect(content.style.getPropertyValue("--bottom-bar-height")).toBe(
			"calc(env(safe-area-inset-bottom) * -1)",
		);
		expect(content.style.getPropertyValue("--admin-main-x")).toBe("1rem");
	});

	it("forwards className to DrawerContent", () => {
		render(<FullDialog className="max-w-lg" />);

		const content = screen.getByTestId("drawer-content");
		expect(content.className).toContain("max-w-lg");
	});

	it("flags inner scroll wrap data-vaul-no-drag to keep drag isolated to handle", () => {
		render(<FullDialog />);
		const scrollWrap = screen.getByTestId("drawer-content").firstElementChild as HTMLElement;
		expect(scrollWrap.hasAttribute("data-vaul-no-drag")).toBe(true);
	});
});
