import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockGetSearchParams } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockGetSearchParams: vi.fn(() => null),
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

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
		open ? <div data-testid="drawer">{children}</div> : null,
	DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DrawerBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
	Check: () => <svg data-testid="icon-check" />,
}));

import { CustomizationsStatusDrawer } from "../customizations-status-drawer";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationsStatusDrawer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
		// Status badges render the labels
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
});
