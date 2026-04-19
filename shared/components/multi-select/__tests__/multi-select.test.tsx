import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMobile, mockMounted, mockHaptic } = vi.hoisted(() => ({
	mockIsMobile: { value: false },
	mockMounted: { value: true },
	mockHaptic: { fn: vi.fn(() => true) },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
}));

vi.mock("@/shared/hooks/use-mounted", () => ({
	useMounted: () => mockMounted.value,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic.fn,
}));

vi.mock("@/shared/utils/view-transition", () => ({
	withViewTransition: <T,>(cb: () => T): T => cb(),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("lucide-react", () => ({
	ChevronDown: () => <svg data-testid="icon-chevron-down" />,
	X: () => <svg data-testid="icon-x" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, className }: any) => (
		<span className={className} data-testid="badge">
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	// eslint-disable-next-line react/display-name
	Button: React.forwardRef(
		(
			{ children, onClick, disabled, role, className, type = "button", ...props }: any,
			ref: any,
		) => (
			<button
				ref={ref}
				type={type}
				onClick={onClick}
				disabled={disabled}
				role={role}
				className={className}
				{...props}
			>
				{children}
			</button>
		),
	),
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ checked, onCheckedChange, disabled, "aria-label": ariaLabel, className }: any) => (
		<input
			type="checkbox"
			checked={checked === true}
			data-indeterminate={checked === "indeterminate"}
			disabled={disabled}
			aria-label={ariaLabel}
			className={className}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			data-testid="checkbox"
		/>
	),
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children, open, snapPoints }: any) => (
		<div
			data-testid="drawer"
			data-open={String(open)}
			data-snap-points={snapPoints ? JSON.stringify(snapPoints) : undefined}
		>
			{children}
		</div>
	),
	DrawerContent: ({
		children,
		className,
		onOverlayClick,
		"data-pending": dataPending,
		"aria-busy": ariaBusy,
	}: any) => (
		<div
			data-testid="drawer-content"
			className={className}
			data-pending={dataPending}
			aria-busy={ariaBusy}
		>
			<button
				type="button"
				data-testid="drawer-overlay"
				onClick={onOverlayClick}
				aria-hidden="true"
			/>
			{children}
		</div>
	),
	DrawerHeader: ({ children, className }: any) => (
		<div data-testid="drawer-header" className={className}>
			{children}
		</div>
	),
	DrawerBody: ({
		children,
		className,
		id,
		role,
		"aria-multiselectable": am,
		"aria-label": al,
	}: any) => (
		<div
			data-testid="drawer-body"
			id={id}
			role={role}
			aria-multiselectable={am}
			aria-label={al}
			className={className}
		>
			{children}
		</div>
	),
	DrawerFooter: ({ children, className }: any) => (
		<div data-testid="drawer-footer" className={className}>
			{children}
		</div>
	),
	DrawerTitle: ({ children, className }: any) => (
		<div data-testid="drawer-title" className={className}>
			{children}
		</div>
	),
	DrawerClose: ({ children, asChild: _asChild }: any) => (
		<div data-testid="drawer-close">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/popover", () => ({
	Popover: ({ children, open }: any) => (
		<div data-testid="popover" data-open={String(open)}>
			{children}
		</div>
	),
	PopoverContent: ({ children, id, role, className }: any) => (
		<div data-testid="popover-content" id={id} role={role} className={className}>
			{children}
		</div>
	),
	PopoverTrigger: ({ children, asChild: _asChild }: any) => (
		<div data-testid="popover-trigger">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: ({ orientation, className }: any) => (
		<hr data-testid="separator" data-orientation={orientation} className={className} />
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
	TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
	TooltipTrigger: ({ children, asChild: _asChild }: any) => (
		<div data-testid="tooltip-trigger">{children}</div>
	),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { MultiSelect } from "../multi-select";
import type { MultiSelectRef } from "../types";

// ============================================================================
// FIXTURES
// ============================================================================

const OPTIONS = [
	{ value: "rouge", label: "Rouge" },
	{ value: "bleu", label: "Bleu" },
	{ value: "vert", label: "Vert" },
	{ value: "jaune", label: "Jaune" },
	{ value: "violet", label: "Violet" },
];

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockIsMobile.value = false;
	mockMounted.value = true;
	mockHaptic.fn = vi.fn(() => true);
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MultiSelect", () => {
	describe("rendering (desktop)", () => {
		it("renders trigger with placeholder when no selection", () => {
			render(
				<MultiSelect options={OPTIONS} onValueChange={vi.fn()} placeholder="Choisir une couleur" />,
			);
			expect(screen.getByText("Choisir une couleur")).toBeTruthy();
		});

		it("uses default placeholder if none provided", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.getByText("Sélectionner")).toBeTruthy();
		});

		it("renders trigger with combobox role", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			const trigger = screen.getByRole("combobox");
			expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
			expect(trigger.getAttribute("aria-expanded")).toBe("false");
		});

		it("renders badges for selected values", () => {
			render(
				<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge", "bleu"]} />,
			);
			const badges = screen.getAllByTestId("badge");
			expect(badges.length).toBe(2);
			expect(badges[0]!.textContent).toContain("Rouge");
			expect(badges[1]!.textContent).toContain("Bleu");
		});

		it("shows +N badge when selection exceeds maxCount", () => {
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={vi.fn()}
					defaultValue={["rouge", "bleu", "vert", "jaune"]}
					maxCount={2}
				/>,
			);
			expect(screen.getByText("+ 2")).toBeTruthy();
		});

		it("renders Popover (not Drawer) on desktop", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.getByTestId("popover")).toBeTruthy();
			expect(screen.queryByTestId("drawer")).toBeNull();
		});

		it("renders option rows with checkboxes", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			// Options = 5 + "Tout sélectionner" = 6 checkboxes
			expect(screen.getAllByTestId("checkbox").length).toBe(6);
		});

		it("hides Select All row when hideSelectAll=true", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} hideSelectAll />);
			// Only options = 5 checkboxes
			expect(screen.getAllByTestId("checkbox").length).toBe(5);
			expect(screen.queryByText("Tout sélectionner")).toBeNull();
		});

		it("shows empty state when no options", () => {
			render(<MultiSelect options={[]} onValueChange={vi.fn()} />);
			expect(screen.getByText("Aucune option disponible")).toBeTruthy();
		});
	});

	describe("selection", () => {
		it("calls onValueChange when toggling an option", () => {
			const onValueChange = vi.fn();
			render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} />);
			const checkboxes = screen.getAllByTestId("checkbox");
			// index 0 = "Tout sélectionner", index 1 = first option (Rouge)
			fireEvent.click(checkboxes[1]!);
			expect(onValueChange).toHaveBeenCalledWith(["rouge"]);
		});

		it("adds value to existing selection", () => {
			const onValueChange = vi.fn();
			render(
				<MultiSelect options={OPTIONS} onValueChange={onValueChange} defaultValue={["rouge"]} />,
			);
			const checkboxes = screen.getAllByTestId("checkbox");
			fireEvent.click(checkboxes[2]!); // Bleu
			expect(onValueChange).toHaveBeenCalledWith(["rouge", "bleu"]);
		});

		it("removes value from selection when toggled off", () => {
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge", "bleu"]}
				/>,
			);
			const checkboxes = screen.getAllByTestId("checkbox");
			fireEvent.click(checkboxes[1]!); // Rouge
			expect(onValueChange).toHaveBeenCalledWith(["bleu"]);
		});

		it("removes a badge when clicking its X button", () => {
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge", "bleu"]}
				/>,
			);
			const removeBtn = screen.getByLabelText("Retirer Rouge");
			fireEvent.click(removeBtn);
			expect(onValueChange).toHaveBeenCalledWith(["bleu"]);
		});

		it("does not toggle disabled options", () => {
			const onValueChange = vi.fn();
			const opts = [
				{ value: "a", label: "A" },
				{ value: "b", label: "B", disabled: true },
			];
			render(<MultiSelect options={opts} onValueChange={onValueChange} />);
			const checkboxes = screen.getAllByTestId("checkbox");
			// index 0 = select-all, 1 = A, 2 = B (disabled)
			fireEvent.click(checkboxes[2]!);
			expect(onValueChange).not.toHaveBeenCalled();
		});
	});

	describe("select all", () => {
		it("selects all enabled options when toggling Select All", () => {
			const onValueChange = vi.fn();
			render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} />);
			const checkboxes = screen.getAllByTestId("checkbox");
			fireEvent.click(checkboxes[0]!); // Tout sélectionner
			expect(onValueChange).toHaveBeenCalledWith(["rouge", "bleu", "vert", "jaune", "violet"]);
		});

		it("clears selection when toggling Select All while all selected", () => {
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge", "bleu", "vert", "jaune", "violet"]}
				/>,
			);
			const checkboxes = screen.getAllByTestId("checkbox");
			fireEvent.click(checkboxes[0]!);
			expect(onValueChange).toHaveBeenCalledWith([]);
		});

		it("excludes disabled options from select all", () => {
			const onValueChange = vi.fn();
			const opts = [
				{ value: "a", label: "A" },
				{ value: "b", label: "B", disabled: true },
				{ value: "c", label: "C" },
			];
			render(<MultiSelect options={opts} onValueChange={onValueChange} />);
			const checkboxes = screen.getAllByTestId("checkbox");
			fireEvent.click(checkboxes[0]!);
			expect(onValueChange).toHaveBeenCalledWith(["a", "c"]);
		});
	});

	describe("clear actions", () => {
		it("clears all selection via trigger X button", () => {
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge", "bleu"]}
				/>,
			);
			const clearBtn = screen.getByLabelText("Effacer les 2 options sélectionnées");
			fireEvent.click(clearBtn);
			expect(onValueChange).toHaveBeenCalledWith([]);
		});

		it("clears extra options beyond maxCount when clicking +N X", () => {
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge", "bleu", "vert", "jaune"]}
					maxCount={2}
				/>,
			);
			const extraClearBtn = screen.getByLabelText("Retirer les 2 options supplémentaires");
			fireEvent.click(extraClearBtn);
			expect(onValueChange).toHaveBeenCalledWith(["rouge", "bleu"]);
		});
	});

	describe("disabled state", () => {
		it("disables trigger button", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} disabled />);
			const trigger = screen.getByRole("combobox");
			expect((trigger as HTMLButtonElement).disabled).toBe(true);
		});

		it("does not toggle options when disabled", () => {
			const onValueChange = vi.fn();
			render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} disabled />);
			const checkboxes = screen.getAllByTestId("checkbox");
			fireEvent.click(checkboxes[1]!);
			expect(onValueChange).not.toHaveBeenCalled();
		});
	});

	describe("ref API", () => {
		it("exposes clear() to wipe selection", () => {
			const onValueChange = vi.fn();
			const ref = React.createRef<MultiSelectRef>();
			render(
				<MultiSelect
					ref={ref}
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge"]}
				/>,
			);
			ref.current!.clear();
			expect(onValueChange).toHaveBeenCalledWith([]);
		});

		it("exposes reset() to restore defaultValue", () => {
			const onValueChange = vi.fn();
			const ref = React.createRef<MultiSelectRef>();
			render(
				<MultiSelect
					ref={ref}
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge"]}
				/>,
			);
			ref.current!.setValues(["bleu"]);
			ref.current!.reset();
			expect(onValueChange).toHaveBeenLastCalledWith(["rouge"]);
		});

		it("exposes getValues() returning current selection", () => {
			const ref = React.createRef<MultiSelectRef>();
			render(
				<MultiSelect ref={ref} options={OPTIONS} onValueChange={vi.fn()} defaultValue={["vert"]} />,
			);
			expect(ref.current!.getValues()).toEqual(["vert"]);
		});

		it("exposes setValues() updating selection", () => {
			const onValueChange = vi.fn();
			const ref = React.createRef<MultiSelectRef>();
			render(<MultiSelect ref={ref} options={OPTIONS} onValueChange={onValueChange} />);
			ref.current!.setValues(["jaune", "violet"]);
			expect(onValueChange).toHaveBeenCalledWith(["jaune", "violet"]);
		});

		it("exposes focus() on the trigger", () => {
			const ref = React.createRef<MultiSelectRef>();
			render(<MultiSelect ref={ref} options={OPTIONS} onValueChange={vi.fn()} />);
			ref.current!.focus();
			const trigger = screen.getByRole("combobox");
			expect(document.activeElement).toBe(trigger);
		});
	});

	describe("haptic feedback", () => {
		it("triggers 'selection' haptic when toggling an option", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			const checkboxes = screen.getAllByTestId("checkbox");
			fireEvent.click(checkboxes[1]!);
			expect(mockHaptic.fn).toHaveBeenCalledWith("selection");
		});

		it("triggers 'light' haptic when clearing", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge"]} />);
			const clearBtn = screen.getByLabelText(/Effacer les 1 options sélectionnées/);
			fireEvent.click(clearBtn);
			expect(mockHaptic.fn).toHaveBeenCalledWith("light");
		});

		it("triggers 'selection' haptic when opening trigger", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));
			expect(mockHaptic.fn).toHaveBeenCalledWith("selection");
		});
	});

	describe("live regions", () => {
		it("renders aria-live polite region", () => {
			const { container } = render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			const live = container.querySelector("[aria-live='polite'][role='status']");
			expect(live).toBeTruthy();
		});

		it("announces no-selection on initial empty", () => {
			const { container } = render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			const region = container.querySelector("[aria-live='polite']:not([role='status'])");
			expect(region?.textContent).toContain("Aucune option sélectionnée");
		});

		it("lists selected labels in the count region", () => {
			const { container } = render(
				<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge", "bleu"]} />,
			);
			const region = container.querySelector("[aria-live='polite']:not([role='status'])");
			expect(region?.textContent).toContain("Rouge");
			expect(region?.textContent).toContain("Bleu");
		});
	});

	describe("accessibility props propagation", () => {
		it("propagates aria-describedby to trigger", () => {
			render(
				<MultiSelect options={OPTIONS} onValueChange={vi.fn()} aria-describedby="external-desc" />,
			);
			const trigger = screen.getByRole("combobox");
			expect(trigger.getAttribute("aria-describedby")).toContain("external-desc");
		});

		it("propagates aria-invalid to trigger", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} aria-invalid />);
			const trigger = screen.getByRole("combobox");
			expect(trigger.getAttribute("aria-invalid")).toBeDefined();
		});

		it("sets aria-label on combobox with count info", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge"]} />);
			const trigger = screen.getByRole("combobox");
			expect(trigger.getAttribute("aria-label")).toContain("1 sur 5");
		});
	});

	describe("mobile rendering", () => {
		beforeEach(() => {
			mockIsMobile.value = true;
		});

		it("renders Drawer (not Popover) on mobile", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.getByTestId("drawer")).toBeTruthy();
			expect(screen.queryByTestId("popover")).toBeNull();
		});

		it("renders Drawer with placeholder as title", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} placeholder="Collections" />);
			expect(screen.getByTestId("drawer-title").textContent).toBe("Collections");
		});

		it("opens the drawer when clicking trigger", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));
			expect(screen.getByTestId("drawer").getAttribute("data-open")).toBe("true");
		});

		it("shows 'Terminer' action in footer", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.getByText("Terminer")).toBeTruthy();
		});

		it("shows 'Effacer' action in footer only when there is a selection", () => {
			const { rerender } = render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.queryByText("Effacer")).toBeNull();
			rerender(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge"]} />);
			expect(screen.getByText("Effacer")).toBeTruthy();
		});

		it("triggers 'medium' haptic on Terminer click", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			// open drawer
			fireEvent.click(screen.getByRole("combobox"));
			mockHaptic.fn.mockClear();
			fireEvent.click(screen.getByText("Terminer"));
			expect(mockHaptic.fn).toHaveBeenCalledWith("medium");
		});

		it("triggers 'light' haptic when overlay is dismissed", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));
			mockHaptic.fn.mockClear();
			fireEvent.click(screen.getByTestId("drawer-overlay"));
			expect(mockHaptic.fn).toHaveBeenCalledWith("light");
		});

		it("applies overscroll-contain on DrawerBody", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.getByTestId("drawer-body").className).toContain("overscroll-contain");
		});

		it("makes DrawerHeader and DrawerFooter sticky with bg isolation", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge"]} />);
			const header = screen.getByTestId("drawer-header").className;
			const footer = screen.getByTestId("drawer-footer").className;
			expect(header).toContain("sticky");
			expect(header).toContain("top-0");
			expect(header).toContain("backdrop-blur-sm");
			expect(footer).toContain("sticky");
			expect(footer).toContain("bottom-0");
			expect(footer).toContain("backdrop-blur-sm");
		});

		it("extends badge X hit area to 44px via after: pseudo on mobile", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge"]} />);
			const removeBtn = screen.getByLabelText("Retirer Rouge");
			expect(removeBtn.className).toContain("after:-inset-2");
			expect(removeBtn.className).toContain("relative");
		});

		it("triggers 'selection' haptic on toggleAll (not 'light')", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));
			mockHaptic.fn.mockClear();
			// index 0 = "Tout sélectionner"
			fireEvent.click(screen.getAllByTestId("checkbox")[0]!);
			expect(mockHaptic.fn).toHaveBeenCalledWith("selection");
			expect(mockHaptic.fn).not.toHaveBeenCalledWith("light");
		});

		it("forwards snapPoints [0.5, 0.92] to Vaul Drawer", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.getByTestId("drawer").getAttribute("data-snap-points")).toBe("[0.5,0.92]");
		});

		it("exposes aria-busy and data-pending while announcing", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			// open drawer triggers ariaListOpen announcement
			fireEvent.click(screen.getByRole("combobox"));
			const content = screen.getByTestId("drawer-content");
			expect(content.getAttribute("data-pending")).toBe("true");
			expect(content.getAttribute("aria-busy")).toBe("true");
		});

		it("renders explicit close button with ariaCloseDrawer label", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.getAllByLabelText("Fermer").length).toBeGreaterThan(0);
		});

		it("uses min-h-14 on footer CTAs (Apple HIG 56px)", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge"]} />);
			const finish = screen.getByText("Terminer").closest("button");
			const clear = screen.getByText("Effacer").closest("button");
			expect(finish?.className).toContain("min-h-14");
			expect(clear?.className).toContain("min-h-14");
		});
	});

	describe("SSR guard", () => {
		it("treats unmounted as desktop (popover) even if isMobile=true", () => {
			mockMounted.value = false;
			mockIsMobile.value = true;
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			expect(screen.getByTestId("popover")).toBeTruthy();
			expect(screen.queryByTestId("drawer")).toBeNull();
		});
	});
});
