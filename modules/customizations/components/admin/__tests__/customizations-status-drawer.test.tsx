import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockGetSearchParams, useIsMobileMock, triggerHapticMock } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockGetSearchParams: vi.fn(() => null),
	useIsMobileMock: vi.fn(),
	triggerHapticMock: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => ({
		get: mockGetSearchParams,
		toString: () => "",
	}),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: useIsMobileMock,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => triggerHapticMock,
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({
		children,
		open,
		onOpenChange,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) =>
		open ? (
			<div
				data-testid="drawer"
				role="button"
				tabIndex={0}
				onClick={() => onOpenChange?.(false)}
				onKeyDown={(e) => e.key === "Enter" && onOpenChange?.(false)}
			>
				{children}
			</div>
		) : null,
	DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DrawerBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({
		children,
		open,
		onOpenChange,
		direction,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		direction?: string;
	}) =>
		open ? (
			<div
				data-testid="sheet"
				data-direction={direction}
				role="button"
				tabIndex={0}
				onClick={() => onOpenChange?.(false)}
				onKeyDown={(e) => e.key === "Enter" && onOpenChange?.(false)}
			>
				{children}
			</div>
		) : null,
	SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-content" className={className}>
			{children}
		</div>
	),
	SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("lucide-react", () => ({
	Check: () => <svg data-testid="icon-check" />,
}));

import { CustomizationsStatusDrawer } from "../customizations-status-drawer";

afterEach(() => {
	cleanup();
	useIsMobileMock.mockReset();
	triggerHapticMock.mockReset();
	mockPush.mockReset();
	mockGetSearchParams.mockReset();
});

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationsStatusDrawer — mobile", () => {
	beforeEach(() => {
		useIsMobileMock.mockReturnValue(true);
		mockGetSearchParams.mockReturnValue(null);
	});

	it("renders the drawer title when open", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByText("Filtrer par statut")).toBeInTheDocument();
	});

	it("does not render when closed", () => {
		render(<CustomizationsStatusDrawer open={false} onOpenChange={vi.fn()} />);
		expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
	});

	it("renders the 'Tous les statuts' option", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByText("Tous les statuts")).toBeInTheDocument();
	});

	it("renders status filter options via status badges", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByText("En attente")).toBeInTheDocument();
		expect(screen.getByText("En cours")).toBeInTheDocument();
		expect(screen.getByText("Terminé")).toBeInTheDocument();
		expect(screen.getByText("Annulé")).toBeInTheDocument();
	});

	it("marks 'Tous les statuts' as selected when no filter is active (default ALL)", () => {
		mockGetSearchParams.mockReturnValue(null);
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		const allOption = screen.getByRole("option", { name: /Tous les statuts/ });
		expect(allOption).toHaveAttribute("aria-selected", "true");
	});

	it("renders the listbox with accessible label", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByRole("listbox", { name: "Filtrer par statut" })).toBeInTheDocument();
	});

	it("shows check icon next to selected option", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByTestId("icon-check")).toBeInTheDocument();
	});

	it("each option button has min-h-11 for WCAG 2.5.5 touch target", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		const options = screen.getAllByRole("option");
		options.forEach((opt) => {
			expect(opt.className).toContain("min-h-11");
		});
	});

	it("triggers selection haptic on option click", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("option", { name: /Tous les statuts/ }));
		expect(triggerHapticMock).toHaveBeenCalledWith("selection");
	});

	it("does not render Sheet on mobile", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
	});
});

describe("CustomizationsStatusDrawer — desktop", () => {
	beforeEach(() => {
		useIsMobileMock.mockReturnValue(false);
		mockGetSearchParams.mockReturnValue(null);
	});

	it("renders a right-anchored Sheet on desktop", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		const sheet = screen.getByTestId("sheet");
		expect(sheet).toHaveAttribute("data-direction", "right");
	});

	it("applies sm:max-w-sm on SheetContent", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByTestId("sheet-content").className).toContain("sm:max-w-sm");
	});

	it("does not render Drawer on desktop", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
	});

	it("renders the same listbox options on desktop", () => {
		render(<CustomizationsStatusDrawer open={true} onOpenChange={vi.fn()} />);
		expect(screen.getByRole("listbox", { name: "Filtrer par statut" })).toBeInTheDocument();
		expect(screen.getByText("Tous les statuts")).toBeInTheDocument();
	});
});
