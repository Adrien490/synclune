import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AdminSortBadge } from "../admin-sort-badge";

// ============================================================================
// Mocks
// ============================================================================

const mockUseActiveListControls = vi.fn();
const mockUseToolbarDrawerOpen = vi.fn();
const mockTriggerHaptic = vi.fn();
const mockRouterPush = vi.fn();
const mockSearchParams = new URLSearchParams();
const mockWithViewTransition = vi.fn((cb: () => void) => cb());

vi.mock("@/shared/hooks", () => ({
	useActiveListControls: () => mockUseActiveListControls(),
	useToolbarDrawer: () => ({ open: mockUseToolbarDrawerOpen }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
}));

vi.mock("@/shared/utils/view-transition", () => ({
	withViewTransition: (cb: () => void) => mockWithViewTransition(cb),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockRouterPush }),
	useSearchParams: () => mockSearchParams,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ArrowsDownUpIcon: (props: Record<string, unknown>) => <svg data-testid="icon-sort" {...props} />,
	XIcon: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
}));

// ============================================================================
// Helpers
// ============================================================================

const SORT_LABELS = {
	"name-ascending": "Nom (A-Z)",
	"name-descending": "Nom (Z-A)",
	"created-descending": "Plus récents",
};

// ============================================================================
// Tests
// ============================================================================

describe("AdminSortBadge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset URL search params
		mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
	});

	afterEach(() => {
		cleanup();
	});

	it("renders nothing when hasActiveSort is false", () => {
		mockUseActiveListControls.mockReturnValue({ hasActiveSort: false });
		const { container } = render(
			<AdminSortBadge sortLabels={SORT_LABELS} defaultSort="name-ascending" />,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders sort badge with current label when hasActiveSort", () => {
		mockSearchParams.set("sortBy", "name-descending");
		mockUseActiveListControls.mockReturnValue({ hasActiveSort: true });
		render(<AdminSortBadge sortLabels={SORT_LABELS} defaultSort="name-ascending" />);
		expect(screen.getByText("Nom (Z-A)")).toBeInTheDocument();
		expect(screen.getByLabelText(/Modifier le tri.*Nom \(Z-A\)/i)).toBeInTheDocument();
	});

	it("opens sort drawer + haptic selection on tap", () => {
		mockSearchParams.set("sortBy", "name-descending");
		mockUseActiveListControls.mockReturnValue({ hasActiveSort: true });
		render(<AdminSortBadge sortLabels={SORT_LABELS} defaultSort="name-ascending" />);
		fireEvent.click(screen.getByLabelText(/Modifier le tri/i));
		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		expect(mockUseToolbarDrawerOpen).toHaveBeenCalledWith("sort");
	});

	it("resets sortBy + withViewTransition + haptic light on X click", () => {
		mockSearchParams.set("sortBy", "name-descending");
		mockUseActiveListControls.mockReturnValue({ hasActiveSort: true });
		render(<AdminSortBadge sortLabels={SORT_LABELS} defaultSort="name-ascending" />);
		fireEvent.click(screen.getByLabelText("Effacer le tri"));
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
		expect(mockWithViewTransition).toHaveBeenCalled();
		expect(mockRouterPush).toHaveBeenCalled();
		const url = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(url).not.toContain("sortBy");
	});

	// P2 (audit 2026-08-01) : conserver un curseur en réinitialisant le tri fait
	// se repositionner Prisma sur cet id dans le NOUVEL orderBy + skip:1 → tranche
	// arbitraire. Même règle que use-url-param / use-filter / sort-drawer.
	it("purge cursor et direction en réinitialisant le tri", () => {
		mockSearchParams.set("sortBy", "name-descending");
		mockSearchParams.set("cursor", "tz4a98xxat96iws9zmbrgj3a");
		mockSearchParams.set("direction", "forward");
		mockSearchParams.set("filter_status", "SHIPPED");
		mockUseActiveListControls.mockReturnValue({ hasActiveSort: true });
		render(<AdminSortBadge sortLabels={SORT_LABELS} defaultSort="name-ascending" />);
		fireEvent.click(screen.getByLabelText("Effacer le tri"));
		const url = mockRouterPush.mock.calls[0]?.[0] as string;
		expect(url).not.toContain("cursor");
		expect(url).not.toContain("direction");
		// Les filtres, eux, survivent au reset du tri.
		expect(url).toContain("filter_status=SHIPPED");
	});

	it("falls back to defaultSort label when sortBy is not in labels map", () => {
		mockSearchParams.set("sortBy", "unknown-sort");
		mockUseActiveListControls.mockReturnValue({ hasActiveSort: true });
		render(<AdminSortBadge sortLabels={SORT_LABELS} defaultSort="name-ascending" />);
		// raw value is shown when no mapping found
		expect(screen.getByText("unknown-sort")).toBeInTheDocument();
	});
});
