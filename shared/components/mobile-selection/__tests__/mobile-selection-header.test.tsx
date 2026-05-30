import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

type MockButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string };

vi.mock("@/shared/components/ui/button", () => ({
	Button: forwardRef<HTMLButtonElement, MockButtonProps>(function MockButton(
		{ children, variant, ...props },
		ref,
	) {
		return (
			<button ref={ref} data-variant={variant} {...props}>
				{children}
			</button>
		);
	}),
}));

import { BulkSelectionProvider, useBulkSelectionContext } from "@/shared/components/data-table";
import { MobileSelectionHeader } from "../mobile-selection-header";

const itemsLabel = { singular: "produit", plural: "produits" };

/**
 * Le déclencheur d'entrée a migré dans la `StickyActionBar` (hors de ce header).
 * Ce trigger de test pilote `enterSelectionMode` depuis le contexte pour simuler
 * l'activation du mode sélection.
 */
function EnterTrigger() {
	const { enterSelectionMode } = useBulkSelectionContext();
	return (
		<button type="button" onClick={enterSelectionMode}>
			__enter__
		</button>
	);
}

afterEach(cleanup);

describe("MobileSelectionHeader", () => {
	it("renders nothing when the page is empty", () => {
		const { container } = render(
			<BulkSelectionProvider pageItemIds={[]}>
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders nothing in mode OFF (the trigger now lives in the StickyActionBar)", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		expect(screen.queryByRole("button", { name: "Sélectionner" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
	});

	it("shows the mode ON header once selection mode is active", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<EnterTrigger />
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "__enter__" }));

		expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Tout sélectionner" })).toBeInTheDocument();
		expect(screen.getByText("Aucun élément sélectionné")).toBeInTheDocument();
	});

	it("shows pluralized count and toggles to 'Tout désélectionner' when all selected", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<EnterTrigger />
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "__enter__" }));
		fireEvent.click(screen.getByRole("button", { name: "Tout sélectionner" }));

		expect(screen.getByText("2 produits sélectionnés")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Tout désélectionner" })).toBeInTheDocument();
	});

	it("Annuler exits selection mode (header collapses back to nothing)", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<EnterTrigger />
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "__enter__" }));
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Tout sélectionner" })).not.toBeInTheDocument();
	});
});
