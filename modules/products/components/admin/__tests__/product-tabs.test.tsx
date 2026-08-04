import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockPathname } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockPathname: { value: "/admin/catalogue/produits/bague-lune/modifier" },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname.value,
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/shared/components/ui/tabs", () => ({
	Tabs: ({
		children,
		value,
		onValueChange,
		className,
	}: {
		children: React.ReactNode;
		value?: string;
		onValueChange?: (value: string) => void;
		className?: string;
	}) => (
		<div data-testid="tabs" data-value={value} className={className}>
			{/* Pass onValueChange to children via data attribute trick using context would be complex;
			    instead expose it via a hidden button for testing */}
			<button
				data-testid="trigger-value-change"
				onClick={(e) => {
					const v = (e.currentTarget as HTMLButtonElement).dataset.changeValue;
					if (v) onValueChange?.(v);
				}}
				style={{ display: "none" }}
			/>
			{children}
		</div>
	),
	TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div role="tablist" className={className}>
			{children}
		</div>
	),
	TabsTrigger: ({
		children,
		value,
		className,
	}: {
		children: React.ReactNode;
		value: string;
		className?: string;
	}) => (
		<button role="tab" data-value={value} className={className}>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	InfoIcon: () => <svg data-testid="icon-info" />,
	PackageIcon: () => <svg data-testid="icon-package-open" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductTabs } from "../product-tabs";

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_PROPS = {
	slug: "bague-lune",
	variantsCount: 3,
};

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProductTabs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPathname.value = "/admin/catalogue/produits/bague-lune/modifier";
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	describe("rendering", () => {
		it("renders the tabs container", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("tabs")).toBeInTheDocument();
		});

		it("renders 'Informations' tab", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByRole("tab", { name: /Informations/ })).toBeInTheDocument();
		});

		it("renders 'Variantes' tab with count", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByRole("tab", { name: /Variantes \(3\)/ })).toBeInTheDocument();
		});

		it("renders variants count correctly", () => {
			render(<ProductTabs slug="bague-lune" variantsCount={7} />);
			expect(screen.getByRole("tab", { name: /Variantes \(7\)/ })).toBeInTheDocument();
		});

		it("renders tab list", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByRole("tablist")).toBeInTheDocument();
		});

		it("renders info icon", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("icon-info")).toBeInTheDocument();
		});

		it("renders package open icon", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("icon-package-open")).toBeInTheDocument();
		});
	});

	// ─── Active tab detection ─────────────────────────────────────────────────

	describe("active tab detection", () => {
		it("sets 'modifier' as active tab when pathname contains /modifier", () => {
			mockPathname.value = "/admin/catalogue/produits/bague-lune/modifier";
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("tabs")).toHaveAttribute("data-value", "modifier");
		});

		it("sets 'variantes' as active tab when pathname contains /variantes", () => {
			mockPathname.value = "/admin/catalogue/produits/bague-lune/variantes";
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("tabs")).toHaveAttribute("data-value", "variantes");
		});

		it("defaults to 'modifier' when pathname does not contain /variantes", () => {
			mockPathname.value = "/admin/catalogue/produits/bague-lune";
			render(<ProductTabs {...DEFAULT_PROPS} />);
			expect(screen.getByTestId("tabs")).toHaveAttribute("data-value", "modifier");
		});
	});

	// ─── Navigation ───────────────────────────────────────────────────────────

	describe("navigation", () => {
		it("navigates to modifier page when 'modifier' tab is selected", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			const trigger = screen.getByTestId("trigger-value-change");
			trigger.dataset.changeValue = "modifier";
			fireEvent.click(trigger);
			expect(mockPush).toHaveBeenCalledWith("/admin/catalogue/produits/bague-lune/modifier");
		});

		it("navigates to variantes page when 'variantes' tab is selected", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			const trigger = screen.getByTestId("trigger-value-change");
			trigger.dataset.changeValue = "variantes";
			fireEvent.click(trigger);
			expect(mockPush).toHaveBeenCalledWith("/admin/catalogue/produits/bague-lune/variantes");
		});

		it("uses correct slug in navigation URLs", () => {
			render(<ProductTabs slug="collier-etoile" variantsCount={2} />);
			const trigger = screen.getByTestId("trigger-value-change");
			trigger.dataset.changeValue = "variantes";
			fireEvent.click(trigger);
			expect(mockPush).toHaveBeenCalledWith("/admin/catalogue/produits/collier-etoile/variantes");
		});

		it("does not navigate when unknown tab value is selected", () => {
			render(<ProductTabs {...DEFAULT_PROPS} />);
			const trigger = screen.getByTestId("trigger-value-change");
			trigger.dataset.changeValue = "unknown";
			fireEvent.click(trigger);
			expect(mockPush).not.toHaveBeenCalled();
		});
	});
});
