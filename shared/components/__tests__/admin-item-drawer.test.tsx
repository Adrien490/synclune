import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useIsMobileMock, triggerHapticMock } = vi.hoisted(() => ({
	useIsMobileMock: vi.fn(),
	triggerHapticMock: vi.fn(),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: useIsMobileMock,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => triggerHapticMock,
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({
		open,
		onOpenChange,
		children,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		children: React.ReactNode;
	}) => (
		<div
			data-testid="drawer"
			data-open={open ? "true" : "false"}
			onClick={() => onOpenChange(false)}
			onKeyDown={(e) => {
				if (e.key === "Enter") onOpenChange(false);
			}}
			role="button"
			tabIndex={0}
		>
			{open ? children : null}
		</div>
	),
	DrawerContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drawer-content">{children}</div>
	),
	DrawerHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drawer-header">{children}</div>
	),
	DrawerTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="drawer-title">{children}</h2>
	),
	DrawerDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="drawer-description">{children}</p>
	),
	DrawerBody: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="drawer-body" className={className}>
			{children}
		</div>
	),
	DrawerFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drawer-footer">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({
		open,
		onOpenChange,
		direction,
		children,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		direction?: string;
		children: React.ReactNode;
	}) => (
		<div
			data-testid="sheet"
			data-open={open ? "true" : "false"}
			data-direction={direction}
			onClick={() => onOpenChange(false)}
			onKeyDown={(e) => {
				if (e.key === "Enter") onOpenChange(false);
			}}
			role="button"
			tabIndex={0}
		>
			{open ? children : null}
		</div>
	),
	SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-content" className={className}>
			{children}
		</div>
	),
	SheetHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-header" className={className}>
			{children}
		</div>
	),
	SheetTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="sheet-title">{children}</h2>
	),
	SheetDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="sheet-description">{children}</p>
	),
	SheetFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-footer" className={className}>
			{children}
		</div>
	),
}));

import { AdminItemDrawer } from "../admin-item-drawer";

afterEach(() => {
	cleanup();
	useIsMobileMock.mockReset();
	triggerHapticMock.mockReset();
});

describe("AdminItemDrawer — mobile", () => {
	const noop = () => undefined;

	beforeEach(() => {
		useIsMobileMock.mockReturnValue(true);
	});

	it("renders title in DrawerTitle", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="Détails commande">
				<p>contenu</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("drawer-title")).toHaveTextContent("Détails commande");
	});

	it("renders children in DrawerBody", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p data-testid="kid">Contenu enfant</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("kid")).toBeInTheDocument();
	});

	it("does not render description block when description prop is omitted", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.queryByTestId("drawer-description")).not.toBeInTheDocument();
	});

	it("renders description block when description prop is provided", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X" description="ma description">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("drawer-description")).toHaveTextContent("ma description");
	});

	it("does not render footer when footer prop is omitted", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.queryByTestId("drawer-footer")).not.toBeInTheDocument();
	});

	it("renders footer block when footer prop is provided", () => {
		render(
			<AdminItemDrawer
				open
				onOpenChange={noop}
				title="X"
				footer={<button data-testid="footer-btn">OK</button>}
			>
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("footer-btn")).toBeInTheDocument();
	});

	it("does not render content when open=false", () => {
		render(
			<AdminItemDrawer open={false} onOpenChange={noop} title="X">
				<p data-testid="kid">kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.queryByTestId("kid")).not.toBeInTheDocument();
	});

	it("propagates open=true via data-open on the Drawer wrapper", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("drawer")).toHaveAttribute("data-open", "true");
	});

	it("applies space-y-5 class on body for vertical rhythm", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("drawer-body").className).toContain("space-y-5");
	});

	it("renders ReactNode description (not just string)", () => {
		render(
			<AdminItemDrawer
				open
				onOpenChange={noop}
				title="X"
				description={<span data-testid="rich">complex node</span>}
			>
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("rich")).toBeInTheDocument();
	});

	it("triggers selection haptic on close (open → false)", () => {
		const onOpenChange = vi.fn();
		render(
			<AdminItemDrawer open onOpenChange={onOpenChange} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		fireEvent.click(screen.getByTestId("drawer"));

		expect(triggerHapticMock).toHaveBeenCalledTimes(1);
		expect(triggerHapticMock).toHaveBeenCalledWith("selection");
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("does not render Sheet primitives on mobile", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
	});
});

describe("AdminItemDrawer — desktop", () => {
	const noop = () => undefined;

	beforeEach(() => {
		useIsMobileMock.mockReturnValue(false);
	});

	it("renders a right-anchored Sheet on desktop", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="Détails utilisateur">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		const sheet = screen.getByTestId("sheet");
		expect(sheet).toHaveAttribute("data-direction", "right");
		expect(sheet).toHaveAttribute("data-open", "true");
	});

	it("renders title in SheetTitle (not DrawerTitle)", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="Détails utilisateur">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("sheet-title")).toHaveTextContent("Détails utilisateur");
		expect(screen.queryByTestId("drawer-title")).not.toBeInTheDocument();
	});

	it("applies sm:max-w-[520px] on SheetContent for desktop width constraint", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("sheet-content").className).toContain("sm:max-w-[520px]");
	});

	it("applies sticky top-0 on header for scroll preservation", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("sheet-header").className).toContain("sticky");
		expect(screen.getByTestId("sheet-header").className).toContain("top-0");
	});

	it("applies sticky bottom-0 on footer when provided", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X" footer={<button>OK</button>}>
				<p>kid</p>
			</AdminItemDrawer>,
		);

		const footer = screen.getByTestId("sheet-footer");
		expect(footer.className).toContain("sticky");
		expect(footer.className).toContain("bottom-0");
	});

	it("does not render footer when prop omitted", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.queryByTestId("sheet-footer")).not.toBeInTheDocument();
	});

	it("renders description in SheetDescription when provided", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X" description="ma description">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.getByTestId("sheet-description")).toHaveTextContent("ma description");
	});

	it("triggers selection haptic on close (open → false)", () => {
		const onOpenChange = vi.fn();
		render(
			<AdminItemDrawer open onOpenChange={onOpenChange} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		fireEvent.click(screen.getByTestId("sheet"));

		expect(triggerHapticMock).toHaveBeenCalledTimes(1);
		expect(triggerHapticMock).toHaveBeenCalledWith("selection");
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("scrollable body has space-y-5 and overflow-y-auto for vertical rhythm", () => {
		const { container } = render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		const body = container.querySelector("[data-slot='admin-item-drawer-body']");
		expect(body).not.toBeNull();
		expect(body?.className).toContain("space-y-5");
		expect(body?.className).toContain("overflow-y-auto");
	});

	it("does not render Drawer primitives on desktop", () => {
		render(
			<AdminItemDrawer open onOpenChange={noop} title="X">
				<p>kid</p>
			</AdminItemDrawer>,
		);

		expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
	});
});
