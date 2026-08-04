import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CheckIcon: () => <svg data-testid="icon-check" />,
	CaretDownIcon: () => <svg data-testid="icon-chevron-down" />,
	MagnifyingGlassIcon: () => <svg data-testid="icon-search" />,
	XIcon: () => <svg data-testid="icon-x" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, className }: any) => (
		<span className={className} data-testid="badge">
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ checked, onCheckedChange, disabled }: any) => (
		<input
			type="checkbox"
			checked={checked === true}
			disabled={disabled}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			data-testid="checkbox"
		/>
	),
}));

vi.mock("@/shared/components/ui/popover", () => ({
	Popover: ({ children, open }: any) => (
		<div data-testid="popover" data-open={String(open)}>
			{children}
		</div>
	),
	PopoverContent: ({ children, className }: any) => (
		<div data-testid="popover-content" className={className}>
			{children}
		</div>
	),
	PopoverTrigger: (props: RenderPropMockProps) =>
		renderPropMock("div", { "data-testid": "popover-trigger", ...props }),
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children, open }: any) => (
		<div data-testid="drawer" data-open={String(open)}>
			{children}
		</div>
	),
	DrawerTrigger: ({ children }: any) => <div data-testid="drawer-trigger">{children}</div>,
	DrawerContent: ({ children }: any) => <div data-testid="drawer-content">{children}</div>,
	DrawerHeader: ({ children }: any) => <div data-testid="drawer-header">{children}</div>,
	DrawerTitle: ({ children }: any) => <h2 data-testid="drawer-title">{children}</h2>,
	DrawerDescription: ({ children }: any) => <p data-testid="drawer-description">{children}</p>,
	DrawerBody: ({ children, className, style, ...rest }: any) => (
		<div
			data-testid="drawer-body"
			className={className}
			style={style}
			data-base-ui-swipe-ignore={rest["data-base-ui-swipe-ignore"] !== undefined ? "" : undefined}
		>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: ({ orientation }: any) => (
		<hr data-testid="separator" data-orientation={orientation} />
	),
}));

const mockTriggerHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockTriggerHaptic,
}));

const mockIsMobile = { value: false };
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
}));

import { MultiSelect } from "../multi-select";

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
	{ value: "c", label: "Gamma" },
];

const MANY_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
	value: `opt-${i}`,
	label: `Option ${i}`,
}));

beforeEach(() => {
	mockTriggerHaptic.mockClear();
	mockIsMobile.value = false;
});

afterEach(cleanup);

describe("MultiSelect — rendering", () => {
	it("renders placeholder when no selection", () => {
		render(
			<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} placeholder="Choisir" />,
		);
		expect(screen.getByText("Choisir")).toBeTruthy();
	});

	it("uses default placeholder", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getByText("Sélectionner")).toBeTruthy();
	});

	it("renders trigger as combobox", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		const trigger = screen.getByRole("combobox");
		expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
	});

	it("renders one badge per selected value", () => {
		render(<MultiSelect options={OPTIONS} value={["a", "b"]} onValueChange={vi.fn()} />);
		const badges = screen.getAllByTestId("badge");
		expect(badges).toHaveLength(2);
		expect(badges[0]!.textContent).toContain("Alpha");
		expect(badges[1]!.textContent).toContain("Beta");
	});

	it("renders one checkbox per option in the listbox", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getAllByTestId("checkbox")).toHaveLength(3);
	});

	it("renders empty state when there are no options", () => {
		render(<MultiSelect options={[]} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getByText("Aucune option disponible")).toBeTruthy();
	});

	it("propagates aria-describedby to trigger", () => {
		render(
			<MultiSelect
				options={OPTIONS}
				value={[]}
				onValueChange={vi.fn()}
				aria-describedby="external-desc"
			/>,
		);
		expect(screen.getByRole("combobox").getAttribute("aria-describedby")).toBe("external-desc");
	});

	it("propagates id to trigger for FieldLabel binding", () => {
		render(<MultiSelect id="my-field" options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getByRole("combobox").id).toBe("my-field");
	});

	it("renders Check icon next to selected option", () => {
		render(<MultiSelect options={OPTIONS} value={["a"]} onValueChange={vi.fn()} />);
		const checks = screen.getAllByTestId("icon-check");
		expect(checks.length).toBe(1);
	});
});

describe("MultiSelect — interactions", () => {
	it("calls onValueChange with the new value when toggling an option", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={onValueChange} />);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(onValueChange).toHaveBeenCalledWith(["a"]);
	});

	it("removes a value when toggled off", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} value={["a", "b"]} onValueChange={onValueChange} />);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(onValueChange).toHaveBeenCalledWith(["b"]);
	});

	it("removes a value via badge X button", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} value={["a"]} onValueChange={onValueChange} />);
		fireEvent.click(screen.getByLabelText("Retirer Alpha"));
		expect(onValueChange).toHaveBeenCalledWith([]);
	});

	it("clears the entire selection via the trigger X button", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} value={["a", "b"]} onValueChange={onValueChange} />);
		fireEvent.click(screen.getByLabelText("Tout effacer"));
		expect(onValueChange).toHaveBeenCalledWith([]);
	});
});

describe("MultiSelect — disabled state", () => {
	it("marks trigger as aria-disabled when disabled", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} disabled />);
		expect(screen.getByRole("combobox").getAttribute("aria-disabled")).toBe("true");
	});

	it("does not call onValueChange when component is disabled", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={onValueChange} disabled />);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("does not call onValueChange when an individual option is disabled", () => {
		const onValueChange = vi.fn();
		const opts = [
			{ value: "a", label: "Alpha" },
			{ value: "b", label: "Beta", disabled: true },
		];
		render(<MultiSelect options={opts} value={[]} onValueChange={onValueChange} />);
		fireEvent.click(screen.getAllByTestId("checkbox")[1]!);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("renders disabled checkbox for disabled option", () => {
		const opts = [
			{ value: "a", label: "Alpha" },
			{ value: "b", label: "Beta", disabled: true },
		];
		render(<MultiSelect options={opts} value={[]} onValueChange={vi.fn()} />);
		expect((screen.getAllByTestId("checkbox")[1] as HTMLInputElement).disabled).toBe(true);
	});
});

describe("MultiSelect — search", () => {
	it("does not render search input when options.length <= searchThreshold", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.queryByRole("searchbox")).toBeNull();
	});

	it("renders search input when options.length > searchThreshold (default 8)", () => {
		render(<MultiSelect options={MANY_OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getByRole("searchbox")).toBeTruthy();
	});

	it("filters options based on search query", () => {
		render(<MultiSelect options={MANY_OPTIONS} value={[]} onValueChange={vi.fn()} />);
		fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Option 1" } });
		// "Option 1", "Option 10", "Option 11" → 3 matches
		expect(screen.getAllByTestId("checkbox")).toHaveLength(3);
	});

	it("shows 'aucun résultat' empty state on no match", () => {
		render(<MultiSelect options={MANY_OPTIONS} value={[]} onValueChange={vi.fn()} />);
		fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzzz" } });
		expect(screen.getByText(/Aucun résultat pour/)).toBeTruthy();
	});

	it("respects custom searchThreshold prop", () => {
		render(
			<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} searchThreshold={2} />,
		);
		expect(screen.getByRole("searchbox")).toBeTruthy();
	});
});

describe("MultiSelect — haptic", () => {
	it("triggers haptic 'selection' on toggle by default", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
	});

	it("triggers haptic 'medium' on clear", () => {
		render(<MultiSelect options={OPTIONS} value={["a", "b"]} onValueChange={vi.fn()} />);
		fireEvent.click(screen.getByLabelText("Tout effacer"));
		expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
	});

	it("respects custom haptic pattern prop", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} haptic="light" />);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});

	it("disables haptic when haptic prop is false", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} haptic={false} />);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(mockTriggerHaptic).not.toHaveBeenCalled();
	});
});

describe("MultiSelect — a11y live region", () => {
	const findLiveRegion = (container: HTMLElement) =>
		container.querySelector('[aria-live="polite"]') as HTMLElement | null;

	it("renders a polite aria-live region", () => {
		const { container } = render(
			<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />,
		);
		const liveRegion = findLiveRegion(container);
		expect(liveRegion).toBeTruthy();
		expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
	});

	it("announces selection on toggle", () => {
		const { container } = render(
			<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />,
		);
		fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
		expect(findLiveRegion(container)?.textContent).toContain("Alpha sélectionné");
	});

	it("announces clear", () => {
		const { container } = render(
			<MultiSelect options={OPTIONS} value={["a"]} onValueChange={vi.fn()} />,
		);
		fireEvent.click(screen.getByLabelText("Tout effacer"));
		expect(findLiveRegion(container)?.textContent).toContain("Sélection vidée");
	});
});

describe("MultiSelect — responsive", () => {
	it("renders Popover on desktop", () => {
		mockIsMobile.value = false;
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getByTestId("popover")).toBeTruthy();
		expect(screen.queryByTestId("drawer")).toBeNull();
	});

	it("renders Drawer on mobile", () => {
		mockIsMobile.value = true;
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getByTestId("drawer")).toBeTruthy();
		expect(screen.queryByTestId("popover")).toBeNull();
	});

	it("DrawerTitle reflects placeholder on mobile", () => {
		mockIsMobile.value = true;
		render(
			<MultiSelect
				options={OPTIONS}
				value={[]}
				onValueChange={vi.fn()}
				placeholder="Choisir des couleurs"
			/>,
		);
		expect(screen.getByTestId("drawer-title").textContent).toBe("Choisir des couleurs");
	});

	it("mobile DrawerBody is flagged data-base-ui-swipe-ignore", () => {
		mockIsMobile.value = true;
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getByTestId("drawer-body").hasAttribute("data-base-ui-swipe-ignore")).toBe(true);
	});
});

describe("MultiSelect — listbox", () => {
	it("listbox has aria-multiselectable=true", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		const listbox = screen.getByRole("listbox");
		expect(listbox.getAttribute("aria-multiselectable")).toBe("true");
	});

	it("listbox is referenced by trigger aria-controls", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		const trigger = screen.getByRole("combobox");
		const listbox = screen.getByRole("listbox");
		expect(trigger.getAttribute("aria-controls")).toBe(listbox.id);
	});

	it("renders each option with role=option and aria-selected", () => {
		render(<MultiSelect options={OPTIONS} value={["a"]} onValueChange={vi.fn()} />);
		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(3);
		expect(options[0]!.getAttribute("aria-selected")).toBe("true");
		expect(options[1]!.getAttribute("aria-selected")).toBe("false");
	});

	it("toggles an option via click on the option row", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={onValueChange} />);
		fireEvent.click(screen.getAllByRole("option")[1]!);
		expect(onValueChange).toHaveBeenCalledWith(["b"]);
	});
});

describe("MultiSelect — keyboard navigation (roving)", () => {
	it("listbox is focusable when no search input is shown", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.getByRole("listbox").getAttribute("tabindex")).toBe("0");
	});

	it("ArrowDown sets aria-activedescendant to the first option", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		const listbox = screen.getByRole("listbox");
		fireEvent.keyDown(listbox, { key: "ArrowDown" });
		expect(listbox.getAttribute("aria-activedescendant")).toBe(`${listbox.id}-opt-0`);
	});

	it("ArrowDown then ArrowUp moves the active descendant", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		const listbox = screen.getByRole("listbox");
		fireEvent.keyDown(listbox, { key: "ArrowDown" });
		fireEvent.keyDown(listbox, { key: "ArrowDown" });
		expect(listbox.getAttribute("aria-activedescendant")).toBe(`${listbox.id}-opt-1`);
		fireEvent.keyDown(listbox, { key: "ArrowUp" });
		expect(listbox.getAttribute("aria-activedescendant")).toBe(`${listbox.id}-opt-0`);
	});

	it("End activates the last option, Home the first", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		const listbox = screen.getByRole("listbox");
		fireEvent.keyDown(listbox, { key: "End" });
		expect(listbox.getAttribute("aria-activedescendant")).toBe(`${listbox.id}-opt-2`);
		fireEvent.keyDown(listbox, { key: "Home" });
		expect(listbox.getAttribute("aria-activedescendant")).toBe(`${listbox.id}-opt-0`);
	});

	it("Enter toggles the active option without closing", () => {
		const onValueChange = vi.fn();
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={onValueChange} />);
		const listbox = screen.getByRole("listbox");
		fireEvent.keyDown(listbox, { key: "ArrowDown" });
		fireEvent.keyDown(listbox, { key: "Enter" });
		expect(onValueChange).toHaveBeenCalledWith(["a"]);
	});

	it("ArrowDown skips disabled options", () => {
		const opts = [
			{ value: "a", label: "Alpha", disabled: true },
			{ value: "b", label: "Beta" },
		];
		render(<MultiSelect options={opts} value={[]} onValueChange={vi.fn()} />);
		const listbox = screen.getByRole("listbox");
		fireEvent.keyDown(listbox, { key: "ArrowDown" });
		expect(listbox.getAttribute("aria-activedescendant")).toBe(`${listbox.id}-opt-1`);
	});

	it("search input carries aria-activedescendant on ArrowDown", () => {
		render(<MultiSelect options={MANY_OPTIONS} value={[]} onValueChange={vi.fn()} />);
		const searchbox = screen.getByRole("searchbox");
		fireEvent.keyDown(searchbox, { key: "ArrowDown" });
		expect(searchbox.getAttribute("aria-activedescendant")).toBeTruthy();
		// listbox is not tab-focusable when search drives navigation
		expect(screen.getByRole("listbox").getAttribute("tabindex")).toBe("-1");
	});
});

describe("MultiSelect — badge overflow", () => {
	it("collapses extra badges into a +N summary", () => {
		render(
			<MultiSelect
				options={OPTIONS}
				value={["a", "b", "c"]}
				onValueChange={vi.fn()}
				maxVisibleBadges={2}
			/>,
		);
		const badges = screen.getAllByTestId("badge");
		// 2 visible badges + 1 "+1" summary badge
		expect(badges).toHaveLength(3);
		expect(badges[2]!.textContent).toContain("+1");
	});

	it("shows all badges when under the cap", () => {
		render(
			<MultiSelect
				options={OPTIONS}
				value={["a", "b"]}
				onValueChange={vi.fn()}
				maxVisibleBadges={2}
			/>,
		);
		expect(screen.getAllByTestId("badge")).toHaveLength(2);
	});
});

describe("MultiSelect — search clear", () => {
	it("renders a clear button when the search has text and resets it", () => {
		render(<MultiSelect options={MANY_OPTIONS} value={[]} onValueChange={vi.fn()} />);
		const searchbox = screen.getByRole("searchbox") as HTMLInputElement;
		fireEvent.change(searchbox, { target: { value: "Option 1" } });
		const clearBtn = screen.getByLabelText("Effacer la recherche");
		fireEvent.click(clearBtn);
		expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
	});
});

describe("MultiSelect — select all", () => {
	it("does not render the select-all row by default", () => {
		render(<MultiSelect options={OPTIONS} value={[]} onValueChange={vi.fn()} />);
		expect(screen.queryByText("Tout sélectionner")).toBeNull();
	});

	it("selects every activable option when toggled on", () => {
		const onValueChange = vi.fn();
		render(
			<MultiSelect options={OPTIONS} value={[]} onValueChange={onValueChange} showSelectAll />,
		);
		fireEvent.click(screen.getByText("Tout sélectionner"));
		expect(onValueChange).toHaveBeenCalledWith(["a", "b", "c"]);
	});

	it("deselects everything when all are selected", () => {
		const onValueChange = vi.fn();
		render(
			<MultiSelect
				options={OPTIONS}
				value={["a", "b", "c"]}
				onValueChange={onValueChange}
				showSelectAll
			/>,
		);
		fireEvent.click(screen.getByText("Tout désélectionner"));
		expect(onValueChange).toHaveBeenCalledWith([]);
	});
});
