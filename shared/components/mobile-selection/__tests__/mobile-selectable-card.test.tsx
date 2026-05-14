import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const triggerHapticMock = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (...args: unknown[]) => triggerHapticMock(...args),
	useHaptic: () => triggerHapticMock,
}));

vi.mock("lucide-react", () => ({
	Check: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
	MoreVertical: (props: Record<string, unknown>) => (
		<svg data-testid="more-vertical-icon" {...props} />
	),
}));

// Flatten LongPressMenuLink to a plain anchor for assertion ergonomics — its own
// suite covers tap/long-press semantics exhaustively.
vi.mock("@/shared/components/long-press-menu-link", () => ({
	LongPressMenuLink: ({
		href,
		ariaLabel,
		children,
		className,
		affordance,
	}: {
		href: string;
		ariaLabel: string;
		children: React.ReactNode;
		className?: string;
		affordance?: React.ReactNode;
	}) => (
		<a href={href} aria-label={ariaLabel} className={className}>
			{children}
			{affordance}
		</a>
	),
}));

import { BulkSelectionProvider, useBulkSelectionContext } from "@/shared/components/data-table";
import { MobileSelectableCard } from "../mobile-selectable-card";

const longPressProps = {
	href: "/admin/catalogue/produits/anneau",
	ariaLabel: "Produit Anneau doré",
	sections: [],
	menuTitle: "Actions",
};

function EnterModeOnMount() {
	const { enterSelectionMode } = useBulkSelectionContext();
	useEffect(() => {
		enterSelectionMode();
	}, [enterSelectionMode]);
	return null;
}

beforeEach(() => {
	triggerHapticMock.mockClear();
});

afterEach(cleanup);

describe("MobileSelectableCard", () => {
	it("renders LongPressMenuLink (anchor) when no provider in parent", () => {
		render(
			<MobileSelectableCard
				id="p-1"
				itemLabel="Produit Anneau doré"
				longPressProps={longPressProps}
			>
				<span>Card content</span>
			</MobileSelectableCard>,
		);

		const link = screen.getByRole("link", { name: "Produit Anneau doré" });
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/admin/catalogue/produits/anneau");
	});

	it("renders LongPressMenuLink when selectionMode is OFF", () => {
		render(
			<BulkSelectionProvider pageItemIds={["p-1"]}>
				<MobileSelectableCard
					id="p-1"
					itemLabel="Produit Anneau doré"
					longPressProps={longPressProps}
				>
					<span>Card content</span>
				</MobileSelectableCard>
			</BulkSelectionProvider>,
		);

		expect(screen.getByRole("link", { name: "Produit Anneau doré" })).toBeInTheDocument();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});

	it("renders a button with role=checkbox in selection mode", () => {
		render(
			<BulkSelectionProvider pageItemIds={["p-1"]}>
				<EnterModeOnMount />
				<MobileSelectableCard
					id="p-1"
					itemLabel="Produit Anneau doré"
					longPressProps={longPressProps}
				>
					<span>Card content</span>
				</MobileSelectableCard>
			</BulkSelectionProvider>,
		);

		const checkbox = screen.getByRole("checkbox", {
			name: "Sélectionner Produit Anneau doré",
		});
		expect(checkbox).toBeInTheDocument();
		expect(checkbox).toHaveAttribute("aria-checked", "false");
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("toggles aria-checked and label on click in selection mode", () => {
		render(
			<BulkSelectionProvider pageItemIds={["p-1"]}>
				<EnterModeOnMount />
				<MobileSelectableCard
					id="p-1"
					itemLabel="Produit Anneau doré"
					longPressProps={longPressProps}
				>
					<span>Card content</span>
				</MobileSelectableCard>
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByRole("checkbox", { name: "Sélectionner Produit Anneau doré" }));

		const checkbox = screen.getByRole("checkbox", {
			name: "Désélectionner Produit Anneau doré",
		});
		expect(checkbox).toHaveAttribute("aria-checked", "true");
	});

	it("renders children inside the selectable button", () => {
		render(
			<BulkSelectionProvider pageItemIds={["p-1"]}>
				<EnterModeOnMount />
				<MobileSelectableCard
					id="p-1"
					itemLabel="Produit Anneau doré"
					longPressProps={longPressProps}
				>
					<span data-testid="card-content">Card content</span>
				</MobileSelectableCard>
			</BulkSelectionProvider>,
		);

		expect(screen.getByTestId("card-content")).toBeInTheDocument();
	});

	it("renders a discoverability affordance (MoreVertical) by default in OFF mode", () => {
		render(
			<MobileSelectableCard
				id="p-1"
				itemLabel="Produit Anneau doré"
				longPressProps={longPressProps}
			>
				<span>Card content</span>
			</MobileSelectableCard>,
		);

		const affordance = screen.getByTestId("more-vertical-icon");
		expect(affordance).toBeInTheDocument();
		expect(affordance).toHaveAttribute("aria-hidden", "true");
		expect(affordance.getAttribute("class") ?? "").toContain("pointer-events-none");
	});

	it("omits the affordance when showAffordance is false", () => {
		render(
			<MobileSelectableCard
				id="p-1"
				itemLabel="Produit Anneau doré"
				longPressProps={longPressProps}
				showAffordance={false}
			>
				<span>Card content</span>
			</MobileSelectableCard>,
		);

		expect(screen.queryByTestId("more-vertical-icon")).not.toBeInTheDocument();
	});

	it("hides the affordance in selection mode (checkbox replaces it)", () => {
		render(
			<BulkSelectionProvider pageItemIds={["p-1"]}>
				<EnterModeOnMount />
				<MobileSelectableCard
					id="p-1"
					itemLabel="Produit Anneau doré"
					longPressProps={longPressProps}
				>
					<span>Card content</span>
				</MobileSelectableCard>
			</BulkSelectionProvider>,
		);

		expect(screen.queryByTestId("more-vertical-icon")).not.toBeInTheDocument();
	});

	it("triggers haptic 'selection' on toggle in selection mode (Mail iOS parity)", () => {
		render(
			<BulkSelectionProvider pageItemIds={["p-1"]}>
				<EnterModeOnMount />
				<MobileSelectableCard
					id="p-1"
					itemLabel="Produit Anneau doré"
					longPressProps={longPressProps}
				>
					<span>Card content</span>
				</MobileSelectableCard>
			</BulkSelectionProvider>,
		);

		// EnterModeOnMount triggers haptic("selection") at mount — clear baseline.
		triggerHapticMock.mockClear();

		fireEvent.click(screen.getByRole("checkbox", { name: "Sélectionner Produit Anneau doré" }));

		expect(triggerHapticMock).toHaveBeenCalledWith("selection");
	});
});
