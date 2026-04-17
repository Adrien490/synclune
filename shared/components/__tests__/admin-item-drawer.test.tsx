import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { AdminItemDrawer } from "../admin-item-drawer";

afterEach(cleanup);

describe("AdminItemDrawer", () => {
	const noop = () => undefined;

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
});
