import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

vi.mock("lucide-react", () => ({
	CheckSquare: (props: Record<string, unknown>) => (
		<svg data-testid="check-square-icon" {...props} />
	),
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

	it("'Sélectionner' button uses outline variant + CheckSquare icon for affordance", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		const button = screen.getByRole("button", { name: "Sélectionner" });
		expect(button).toHaveAttribute("data-variant", "outline");
		expect(screen.getByTestId("check-square-icon")).toBeInTheDocument();
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

	it("restores focus on the 'Sélectionner' trigger after Annuler (WCAG 2.4.3)", async () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<MobileSelectionHeader itemsLabel={itemsLabel} />
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Sélectionner" }));
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		// Flush requestAnimationFrame inside act so React has applied the state update.
		await act(async () => {
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		});

		const trigger = screen.getByRole("button", { name: "Sélectionner" });
		expect(document.activeElement).toBe(trigger);
	});
});
