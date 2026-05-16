import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as ReactType from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockSearchParams, mockHaptic } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockSearchParams: new URLSearchParams(),
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams,
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof ReactType>();
	return {
		...actual,
		useOptimistic: <T,>(state: T) => [state, vi.fn()] as [T, (val: T) => void],
	};
});

vi.mock("@/app/generated/prisma/browser", () => ({
	DiscountType: {
		PERCENTAGE: "PERCENTAGE",
		FIXED_AMOUNT: "FIXED_AMOUNT",
	},
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_TYPE_LABELS: {
		PERCENTAGE: "Pourcentage",
		FIXED_AMOUNT: "Montant fixe",
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({
		open,
		onOpenChange,
		handleOnly,
		children,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		handleOnly?: boolean;
		children: React.ReactNode;
	}) => (
		<div data-testid="drawer" data-open={open} data-handle-only={String(Boolean(handleOnly))}>
			{open && children}
			<button data-testid="close-drawer" onClick={() => onOpenChange(false)}>
				Fermer
			</button>
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
	DrawerBody: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
		<div
			data-testid="drawer-body"
			data-vaul-no-drag={rest["data-vaul-no-drag"] !== undefined ? "" : undefined}
		>
			{children}
		</div>
	),
}));

vi.mock("lucide-react", () => ({
	Check: () => <svg data-testid="icon-check" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { DiscountsFilterDrawer } from "../discounts-filter-drawer";

// ============================================================================
// HELPERS
// ============================================================================

function renderDrawer(open = true, onOpenChange = vi.fn()) {
	return render(<DiscountsFilterDrawer open={open} onOpenChange={onOpenChange} />);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	const keys = Array.from(mockSearchParams.keys());
	for (const key of keys) {
		mockSearchParams.delete(key);
	}
});

describe("DiscountsFilterDrawer", () => {
	describe("rendering", () => {
		it("renders the drawer with correct title", () => {
			renderDrawer();
			expect(screen.getByTestId("drawer-title")).toHaveTextContent("Filtrer les codes promo");
		});

		it("renders the listbox with accessible label", () => {
			renderDrawer();
			expect(screen.getByRole("listbox", { name: "Filtrer les codes promo" })).toBeInTheDocument();
		});

		it("renders all 7 filter options", () => {
			renderDrawer();
			expect(screen.getAllByRole("option")).toHaveLength(7);
		});

		it("renders 'Tous' option", () => {
			renderDrawer();
			expect(screen.getByRole("option", { name: "Tous" })).toBeInTheDocument();
		});

		it("renders 'Actifs uniquement' option", () => {
			renderDrawer();
			expect(screen.getByRole("option", { name: "Actifs uniquement" })).toBeInTheDocument();
		});

		it("renders 'Inactifs uniquement' option", () => {
			renderDrawer();
			expect(screen.getByRole("option", { name: "Inactifs uniquement" })).toBeInTheDocument();
		});

		it("renders 'Pourcentage' type option", () => {
			renderDrawer();
			expect(screen.getByRole("option", { name: "Pourcentage" })).toBeInTheDocument();
		});

		it("renders 'Montant fixe' type option", () => {
			renderDrawer();
			expect(screen.getByRole("option", { name: "Montant fixe" })).toBeInTheDocument();
		});

		it("renders 'Avec utilisations' option", () => {
			renderDrawer();
			expect(screen.getByRole("option", { name: "Avec utilisations" })).toBeInTheDocument();
		});

		it("renders 'Sans utilisation' option", () => {
			renderDrawer();
			expect(screen.getByRole("option", { name: "Sans utilisation" })).toBeInTheDocument();
		});

		it("does not render content when drawer is closed", () => {
			renderDrawer(false);
			expect(screen.queryByTestId("drawer-title")).not.toBeInTheDocument();
		});

		it("activates handleOnly to prevent scroll/drag conflict", () => {
			renderDrawer();
			expect(screen.getByTestId("drawer").getAttribute("data-handle-only")).toBe("true");
		});

		it("flags DrawerBody data-vaul-no-drag", () => {
			renderDrawer();
			expect(screen.getByTestId("drawer-body").hasAttribute("data-vaul-no-drag")).toBe(true);
		});
	});

	describe("selected state", () => {
		it("marks 'Tous' as selected when no filters are active", () => {
			renderDrawer();
			const tousOption = screen.getByRole("option", { name: "Tous" });
			expect(tousOption).toHaveAttribute("aria-selected", "true");
		});

		it("marks other options as not selected when no filters are active", () => {
			renderDrawer();
			const actifOption = screen.getByRole("option", { name: "Actifs uniquement" });
			expect(actifOption).toHaveAttribute("aria-selected", "false");
		});

		it("marks 'Actifs uniquement' as selected when filter_isActive=true", () => {
			mockSearchParams.set("filter_isActive", "true");
			renderDrawer();
			const option = screen.getByRole("option", { name: "Actifs uniquement" });
			expect(option).toHaveAttribute("aria-selected", "true");
		});

		it("marks 'Inactifs uniquement' as selected when filter_isActive=false", () => {
			mockSearchParams.set("filter_isActive", "false");
			renderDrawer();
			const option = screen.getByRole("option", { name: "Inactifs uniquement" });
			expect(option).toHaveAttribute("aria-selected", "true");
		});

		it("marks 'Pourcentage' as selected when filter_type=PERCENTAGE", () => {
			mockSearchParams.set("filter_type", "PERCENTAGE");
			renderDrawer();
			const option = screen.getByRole("option", { name: "Pourcentage" });
			expect(option).toHaveAttribute("aria-selected", "true");
		});

		it("marks 'Montant fixe' as selected when filter_type=FIXED_AMOUNT", () => {
			mockSearchParams.set("filter_type", "FIXED_AMOUNT");
			renderDrawer();
			const option = screen.getByRole("option", { name: "Montant fixe" });
			expect(option).toHaveAttribute("aria-selected", "true");
		});

		it("marks 'Avec utilisations' as selected when filter_hasUsages=true", () => {
			mockSearchParams.set("filter_hasUsages", "true");
			renderDrawer();
			const option = screen.getByRole("option", { name: "Avec utilisations" });
			expect(option).toHaveAttribute("aria-selected", "true");
		});

		it("marks 'Sans utilisation' as selected when filter_hasUsages=false", () => {
			mockSearchParams.set("filter_hasUsages", "false");
			renderDrawer();
			const option = screen.getByRole("option", { name: "Sans utilisation" });
			expect(option).toHaveAttribute("aria-selected", "true");
		});

		it("shows check icon only on selected option", () => {
			renderDrawer();
			// 'Tous' is selected, check icon should appear once
			expect(screen.getAllByTestId("icon-check")).toHaveLength(1);
		});
	});

	describe("filter selection", () => {
		it("clicking 'Actifs uniquement' calls router.push with filter_isActive=true", () => {
			const onOpenChange = vi.fn();
			renderDrawer(true, onOpenChange);
			fireEvent.click(screen.getByRole("option", { name: "Actifs uniquement" }));
			expect(mockPush).toHaveBeenCalledOnce();
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).toContain("filter_isActive=true");
		});

		it("clicking 'Inactifs uniquement' calls router.push with filter_isActive=false", () => {
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Inactifs uniquement" }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).toContain("filter_isActive=false");
		});

		it("clicking 'Pourcentage' calls router.push with filter_type=PERCENTAGE", () => {
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Pourcentage" }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).toContain("filter_type=PERCENTAGE");
		});

		it("clicking 'Montant fixe' calls router.push with filter_type=FIXED_AMOUNT", () => {
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Montant fixe" }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).toContain("filter_type=FIXED_AMOUNT");
		});

		it("clicking 'Avec utilisations' calls router.push with filter_hasUsages=true", () => {
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Avec utilisations" }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).toContain("filter_hasUsages=true");
		});

		it("clicking 'Sans utilisation' calls router.push with filter_hasUsages=false", () => {
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Sans utilisation" }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).toContain("filter_hasUsages=false");
		});

		it("clicking 'Tous' clears all filter params", () => {
			mockSearchParams.set("filter_isActive", "true");
			mockSearchParams.set("filter_type", "PERCENTAGE");
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Tous" }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).not.toContain("filter_isActive");
			expect(url).not.toContain("filter_type");
			expect(url).not.toContain("filter_hasUsages");
		});

		it("selecting any option removes cursor and direction params", () => {
			mockSearchParams.set("cursor", "abc123");
			mockSearchParams.set("direction", "next");
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Actifs uniquement" }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).not.toContain("cursor");
			expect(url).not.toContain("direction");
		});

		it("selecting a filter option clears other filter params", () => {
			mockSearchParams.set("filter_type", "PERCENTAGE");
			mockSearchParams.set("filter_hasUsages", "true");
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Actifs uniquement" }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).not.toContain("filter_type");
			expect(url).not.toContain("filter_hasUsages");
			expect(url).toContain("filter_isActive=true");
		});

		it("calls router.push with scroll: false", () => {
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Actifs uniquement" }));
			expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
		});

		it("calls onOpenChange(false) after selecting a filter", () => {
			const onOpenChange = vi.fn();
			renderDrawer(true, onOpenChange);
			fireEvent.click(screen.getByRole("option", { name: "Actifs uniquement" }));
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("triggers selection haptic when a filter option is clicked", () => {
			renderDrawer();
			fireEvent.click(screen.getByRole("option", { name: "Actifs uniquement" }));
			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});
	});

	describe("open/close control", () => {
		it("passes open prop to Drawer", () => {
			renderDrawer(true);
			expect(screen.getByTestId("drawer")).toHaveAttribute("data-open", "true");
		});

		it("passes closed state to Drawer", () => {
			renderDrawer(false);
			expect(screen.getByTestId("drawer")).toHaveAttribute("data-open", "false");
		});

		it("calls onOpenChange when drawer close button is clicked", () => {
			const onOpenChange = vi.fn();
			renderDrawer(true, onOpenChange);
			fireEvent.click(screen.getByTestId("close-drawer"));
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
