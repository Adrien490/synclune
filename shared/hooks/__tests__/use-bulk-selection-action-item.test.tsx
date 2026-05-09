import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

vi.mock("lucide-react", () => ({
	CheckSquare: (props: Record<string, unknown>) => (
		<svg data-testid="icon-check-square" {...props} />
	),
	Square: (props: Record<string, unknown>) => <svg data-testid="icon-square" {...props} />,
}));

import { BulkSelectionProvider, useBulkSelectionContext } from "@/shared/components/data-table";

import { useBulkSelectionActionItem } from "../use-bulk-selection-action-item";

afterEach(cleanup);

function Probe({ id }: { id: string }) {
	const item = useBulkSelectionActionItem(id);
	const ctx = useBulkSelectionContext();
	if (!item) return <span data-testid="null">null</span>;
	return (
		<div>
			<span data-testid="label">{item.label}</span>
			<span data-testid="haptic">{item.haptic}</span>
			<span data-testid="mode">{ctx.selectionMode ? "on" : "off"}</span>
			<span data-testid="count">{ctx.selectedCount}</span>
			<button onClick={() => item.onSelect?.()}>activate</button>
		</div>
	);
}

function StandaloneProbe({ id }: { id: string }) {
	const item = useBulkSelectionActionItem(id);
	if (!item) return <span data-testid="null">null</span>;
	return <span data-testid="label">{item.label}</span>;
}

describe("useBulkSelectionActionItem", () => {
	it("returns null when no BulkSelectionProvider is mounted (graceful no-op)", () => {
		render(<StandaloneProbe id="a" />);
		expect(screen.getByTestId("null")).toBeInTheDocument();
	});

	it("activating from mode OFF enters mode and toggles the item", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a", "b"]}>
				<Probe id="a" />
			</BulkSelectionProvider>,
		);

		expect(screen.getByTestId("mode")).toHaveTextContent("off");
		expect(screen.getByTestId("count")).toHaveTextContent("0");

		fireEvent.click(screen.getByText("activate"));

		expect(screen.getByTestId("mode")).toHaveTextContent("on");
		expect(screen.getByTestId("count")).toHaveTextContent("1");
	});

	it("activating an already-selected item removes it from the selection", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<Probe id="a" />
			</BulkSelectionProvider>,
		);

		fireEvent.click(screen.getByText("activate"));
		expect(screen.getByTestId("count")).toHaveTextContent("1");
		expect(screen.getByTestId("label")).toHaveTextContent("Retirer de la sélection");

		fireEvent.click(screen.getByText("activate"));
		expect(screen.getByTestId("count")).toHaveTextContent("0");
		expect(screen.getByTestId("label")).toHaveTextContent("Sélectionner");
	});

	it("uses haptic 'selection' (matches mode toggle pattern)", () => {
		render(
			<BulkSelectionProvider pageItemIds={["a"]}>
				<Probe id="a" />
			</BulkSelectionProvider>,
		);
		expect(screen.getByTestId("haptic")).toHaveTextContent("selection");
	});
});
