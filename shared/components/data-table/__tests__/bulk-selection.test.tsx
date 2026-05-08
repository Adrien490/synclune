import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

vi.mock("lucide-react", () => ({
	X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
	CheckIcon: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
	MinusIcon: (props: Record<string, unknown>) => <svg data-testid="minus-icon" {...props} />,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
	} & Record<string, unknown>) => (
		<button onClick={onClick} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({
		checked,
		onCheckedChange,
		"aria-label": ariaLabel,
		onClick,
	}: {
		checked: boolean | "indeterminate";
		onCheckedChange?: (next: boolean | "indeterminate") => void;
		"aria-label"?: string;
		onClick?: (event: React.MouseEvent) => void;
	}) => (
		<button
			type="button"
			role="checkbox"
			aria-label={ariaLabel}
			aria-checked={checked === "indeterminate" ? "mixed" : checked}
			data-state={
				checked === true ? "checked" : checked === "indeterminate" ? "indeterminate" : "unchecked"
			}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				onCheckedChange?.(checked === true ? false : true);
			}}
		>
			{checked === true ? "✓" : checked === "indeterminate" ? "−" : ""}
		</button>
	),
}));

import { BulkSelectionProvider } from "../bulk-selection-context";
import { BulkSelectionHeaderCheckbox, BulkSelectionRowCheckbox } from "../bulk-selection-checkbox";
import { BulkSelectionToolbar } from "../bulk-selection-toolbar";

afterEach(cleanup);

function renderWithProvider(pageItemIds: string[], children: React.ReactNode) {
	return render(
		<BulkSelectionProvider pageItemIds={pageItemIds}>{children}</BulkSelectionProvider>,
	);
}

describe("BulkSelectionRowCheckbox", () => {
	it("toggles selection on click", () => {
		renderWithProvider(
			["a", "b"],
			<>
				<BulkSelectionRowCheckbox id="a" itemLabel="Bague A" />
				<BulkSelectionToolbar itemsLabel={{ singular: "produit", plural: "produits" }} />
			</>,
		);

		const checkbox = screen.getByLabelText("Sélectionner Bague A");
		fireEvent.click(checkbox);

		expect(screen.getByText("1 produit sélectionné")).toBeInTheDocument();
	});

	it("uses generic aria-label when itemLabel missing", () => {
		renderWithProvider(["a"], <BulkSelectionRowCheckbox id="a" />);
		expect(screen.getByLabelText("Sélectionner cette ligne")).toBeInTheDocument();
	});
});

describe("BulkSelectionHeaderCheckbox", () => {
	it("renders nothing when page is empty", () => {
		renderWithProvider([], <BulkSelectionHeaderCheckbox />);
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});

	it("toggles all visible items", () => {
		renderWithProvider(
			["a", "b"],
			<>
				<BulkSelectionHeaderCheckbox itemsLabel="produits" />
				<BulkSelectionRowCheckbox id="a" />
				<BulkSelectionRowCheckbox id="b" />
				<BulkSelectionToolbar itemsLabel={{ singular: "produit", plural: "produits" }} />
			</>,
		);

		const headerCheckbox = screen.getByLabelText("Sélectionner produits de la page");
		fireEvent.click(headerCheckbox);

		expect(screen.getByText(/2\s+produits sélectionnés/)).toBeInTheDocument();
	});

	it("reports indeterminate when partial selection", () => {
		renderWithProvider(
			["a", "b"],
			<>
				<BulkSelectionHeaderCheckbox itemsLabel="bagues" />
				<BulkSelectionRowCheckbox id="a" />
			</>,
		);

		fireEvent.click(screen.getByLabelText("Sélectionner cette ligne"));

		const headerCheckbox = screen.getByRole("checkbox", { name: /sélectionner.*de la page/i });
		expect(headerCheckbox).toHaveAttribute("data-state", "indeterminate");
	});
});

describe("BulkSelectionToolbar", () => {
	it("hides when no selection", () => {
		renderWithProvider(
			["a"],
			<BulkSelectionToolbar itemsLabel={{ singular: "produit", plural: "produits" }} />,
		);

		expect(screen.queryByRole("region", { name: "Actions groupées" })).not.toBeInTheDocument();
	});

	it("clears selection on X button", () => {
		renderWithProvider(
			["a"],
			<>
				<BulkSelectionRowCheckbox id="a" />
				<BulkSelectionToolbar itemsLabel={{ singular: "produit", plural: "produits" }} />
			</>,
		);

		fireEvent.click(screen.getByLabelText("Sélectionner cette ligne"));
		expect(screen.getByText("1 produit sélectionné")).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Effacer la sélection"));
		expect(screen.queryByRole("region", { name: "Actions groupées" })).not.toBeInTheDocument();
	});

	it("renders children full-width without count/clear in bottom-bar mode", () => {
		renderWithProvider(
			["a"],
			<BulkSelectionToolbar
				itemsLabel={{ singular: "produit", plural: "produits" }}
				presentation="bottom-bar"
			>
				<button data-testid="bulk-action-archive">Archiver</button>
			</BulkSelectionToolbar>,
		);

		expect(screen.getByTestId("bulk-action-archive")).toBeInTheDocument();
		expect(screen.queryByLabelText("Effacer la sélection")).not.toBeInTheDocument();
		expect(screen.queryByRole("region", { name: "Actions groupées" })).not.toBeInTheDocument();
	});

	it("returns null in bottom-bar mode without children", () => {
		const { container } = renderWithProvider(
			["a"],
			<BulkSelectionToolbar
				itemsLabel={{ singular: "produit", plural: "produits" }}
				presentation="bottom-bar"
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});

// ============================================================================
// SELECTION MODE (mobile pattern Mail iOS)
// ============================================================================

import { useBulkSelectionContext } from "../bulk-selection-context";

function SelectionModeProbe() {
	const {
		selectionMode,
		selectedCount,
		enterSelectionMode,
		exitSelectionMode,
		selectAllVisible,
		clear,
		toggle,
		pageState,
	} = useBulkSelectionContext();
	return (
		<div>
			<span data-testid="mode">{selectionMode ? "on" : "off"}</span>
			<span data-testid="count">{selectedCount}</span>
			<span data-testid="page-state">{pageState}</span>
			<button onClick={enterSelectionMode}>enter</button>
			<button onClick={exitSelectionMode}>exit</button>
			<button onClick={selectAllVisible}>select-all</button>
			<button onClick={clear}>clear</button>
			<button onClick={() => toggle("a")}>toggle-a</button>
		</div>
	);
}

describe("BulkSelectionContext — selectionMode", () => {
	it("starts in OFF mode by default", () => {
		renderWithProvider(["a", "b"], <SelectionModeProbe />);
		expect(screen.getByTestId("mode")).toHaveTextContent("off");
	});

	it("enterSelectionMode flips selectionMode to ON", () => {
		renderWithProvider(["a", "b"], <SelectionModeProbe />);
		fireEvent.click(screen.getByText("enter"));
		expect(screen.getByTestId("mode")).toHaveTextContent("on");
	});

	it("exitSelectionMode resets selectionMode and clears selection", () => {
		renderWithProvider(["a", "b"], <SelectionModeProbe />);
		fireEvent.click(screen.getByText("enter"));
		fireEvent.click(screen.getByText("toggle-a"));
		expect(screen.getByTestId("count")).toHaveTextContent("1");

		fireEvent.click(screen.getByText("exit"));
		expect(screen.getByTestId("mode")).toHaveTextContent("off");
		expect(screen.getByTestId("count")).toHaveTextContent("0");
	});

	it("clear() also resets selectionMode (sortie cohérente)", () => {
		renderWithProvider(["a", "b"], <SelectionModeProbe />);
		fireEvent.click(screen.getByText("enter"));
		fireEvent.click(screen.getByText("toggle-a"));
		fireEvent.click(screen.getByText("clear"));

		expect(screen.getByTestId("mode")).toHaveTextContent("off");
		expect(screen.getByTestId("count")).toHaveTextContent("0");
	});

	it("selectAllVisible is idempotent (toggle on/off)", () => {
		renderWithProvider(["a", "b"], <SelectionModeProbe />);
		fireEvent.click(screen.getByText("select-all"));
		expect(screen.getByTestId("count")).toHaveTextContent("2");
		expect(screen.getByTestId("page-state")).toHaveTextContent("all");

		fireEvent.click(screen.getByText("select-all"));
		expect(screen.getByTestId("count")).toHaveTextContent("0");
		expect(screen.getByTestId("page-state")).toHaveTextContent("none");
	});
});
