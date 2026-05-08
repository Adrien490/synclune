import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-pressed": ariaPressed,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		"aria-pressed"?: boolean;
	} & Record<string, unknown>) => (
		<button onClick={onClick} aria-pressed={ariaPressed} {...props}>
			{children}
		</button>
	),
}));

import { BulkSelectionProvider } from "@/shared/components/data-table";
import { MobileSelectionHeader } from "../mobile-selection-header";

const itemsLabel = { singular: "produit", plural: "produits" };

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

	it("renders only the 'Sélectionner' CTA in mode OFF", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		expect(screen.getByRole("button", { name: "Sélectionner" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
	});

	it("flips to mode ON header on Sélectionner click", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Sélectionner" }));

		expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Tout sélectionner" })).toBeInTheDocument();
		expect(screen.getByText("Aucun élément sélectionné")).toBeInTheDocument();
	});

	it("shows pluralized count and toggles to 'Tout désélectionner' when all selected", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Sélectionner" }));
		fireEvent.click(screen.getByRole("button", { name: "Tout sélectionner" }));

		expect(screen.getByText("2 produits sélectionnés")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Tout désélectionner" })).toBeInTheDocument();
	});

	it("Annuler exits selection mode", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Sélectionner" }));
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		expect(screen.getByRole("button", { name: "Sélectionner" })).toBeInTheDocument();
	});
});
