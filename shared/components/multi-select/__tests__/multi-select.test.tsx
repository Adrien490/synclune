import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMobile, mockMounted } = vi.hoisted(() => ({
	mockIsMobile: { value: false },
	mockMounted: { value: true },
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

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("lucide-react", () => ({
	ArrowLeftIcon: () => <svg data-testid="icon-arrow-left" />,
	CheckIcon: () => <svg data-testid="icon-check" />,
	ChevronDown: () => <svg data-testid="icon-chevron-down" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	XIcon: () => <svg data-testid="icon-x" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, className, style }: any) => (
		<span className={className} style={style} data-testid="badge">
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	// eslint-disable-next-line react/display-name
	Button: React.forwardRef(
		({ children, onClick, disabled, role, className, ...props }: any, ref: any) => (
			<button
				ref={ref}
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

vi.mock("@/shared/components/ui/command", () => ({
	Command: ({ children, className }: any) => (
		<div data-testid="command" className={className}>
			{children}
		</div>
	),
	CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
	CommandGroup: ({ children, heading }: any) => (
		<div data-testid="command-group" data-heading={heading}>
			{children}
		</div>
	),
	CommandInput: ({ onValueChange, value, placeholder, ...props }: any) => (
		<input
			data-testid="command-input"
			value={value ?? ""}
			placeholder={placeholder}
			onChange={(e) => onValueChange?.(e.target.value)}
			{...props}
		/>
	),
	CommandItem: ({
		children,
		onSelect,
		role,
		"aria-selected": ariaSelected,
		"aria-label": ariaLabel,
		disabled,
	}: any) => (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div
			role={role ?? "option"}
			aria-selected={ariaSelected}
			aria-label={ariaLabel}
			data-testid="command-item"
			onClick={() => !disabled && onSelect?.()}
		>
			{children}
		</div>
	),
	CommandList: ({ children, className }: any) => (
		<div data-testid="command-list" className={className}>
			{children}
		</div>
	),
	CommandSeparator: () => <hr data-testid="command-separator" />,
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({ children, open, onOpenChange: _onOpenChange }: any) => (
		<div data-testid="drawer" data-open={String(open)}>
			{children}
		</div>
	),
	DrawerClose: ({ children, asChild: _asChild }: any) => (
		<div data-testid="drawer-close">{children}</div>
	),
	DrawerContent: ({ children, className }: any) => (
		<div data-testid="drawer-content" className={className}>
			{children}
		</div>
	),
	DrawerTitle: ({ children, className }: any) => (
		<div data-testid="drawer-title" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/ui/popover", () => ({
	Popover: ({ children, open, onOpenChange: _onOpenChange }: any) => (
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

vi.mock("@/shared/components/ui/spinner", () => ({
	Spinner: ({ className }: any) => <svg data-testid="spinner" className={className} />,
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
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MultiSelect", () => {
	// ============================================================================
	// RENDERING
	// ============================================================================

	describe("rendering", () => {
		it("renders trigger with placeholder when no selection", () => {
			render(
				<MultiSelect options={OPTIONS} onValueChange={vi.fn()} placeholder="Choisir une couleur" />,
			);

			expect(screen.getByText("Choisir une couleur")).toBeInTheDocument();
		});

		it("trigger has role combobox and aria-haspopup listbox", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);

			const trigger = screen.getByRole("combobox");
			expect(trigger).toBeInTheDocument();
			expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
		});

		it("renders badges for selected values", () => {
			render(
				<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge", "bleu"]} />,
			);

			const badges = screen.getAllByTestId("badge");
			const badgeTexts = badges.map((b) => b.textContent);
			expect(badgeTexts.some((t) => t!.includes("Rouge"))).toBe(true);
			expect(badgeTexts.some((t) => t!.includes("Bleu"))).toBe(true);
		});

		it("shows +N de plus badge when selections exceed maxCount", () => {
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={vi.fn()}
					defaultValue={["rouge", "bleu", "vert", "jaune"]}
					maxCount={3}
				/>,
			);

			expect(screen.getByText("+ 1 de plus")).toBeInTheDocument();
		});

		it("shows loading spinner when isLoading is true", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} isLoading={true} />);

			// Open popover to reveal content
			fireEvent.click(screen.getByRole("combobox"));
			expect(screen.getByTestId("spinner")).toBeInTheDocument();
		});
	});

	// ============================================================================
	// SELECTION
	// ============================================================================

	describe("selection", () => {
		it("calls onValueChange when an option is toggled", () => {
			const onValueChange = vi.fn();
			render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} />);

			fireEvent.click(screen.getByRole("combobox"));

			const rougeOption = screen.getByRole("option", { name: /rouge, non sélectionné/i });
			fireEvent.click(rougeOption);

			expect(onValueChange).toHaveBeenCalledWith(["rouge"]);
		});

		it("selecting an option adds it to the selection", () => {
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["bleu"]}
					closeOnSelect={false}
				/>,
			);

			fireEvent.click(screen.getByRole("combobox"));

			const vertOption = screen.getByRole("option", { name: /vert, non sélectionné/i });
			fireEvent.click(vertOption);

			expect(onValueChange).toHaveBeenCalledWith(["bleu", "vert"]);
		});

		it("deselecting via badge remove button calls onValueChange without that value", () => {
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge", "bleu"]}
				/>,
			);

			const removeButton = screen.getByRole("button", {
				name: "Retirer Rouge de la sélection",
			});
			fireEvent.click(removeButton);

			expect(onValueChange).toHaveBeenCalledWith(["bleu"]);
		});
	});

	// ============================================================================
	// SELECT ALL
	// ============================================================================

	describe("select all", () => {
		it("renders Tout sélectionner option when hideSelectAll is false", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} hideSelectAll={false} />);

			fireEvent.click(screen.getByRole("combobox"));

			expect(screen.getByText("(Tout sélectionner)")).toBeInTheDocument();
		});

		it("hides Tout sélectionner when hideSelectAll is true", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} hideSelectAll={true} />);

			fireEvent.click(screen.getByRole("combobox"));

			expect(screen.queryByText("(Tout sélectionner)")).not.toBeInTheDocument();
		});
	});

	// ============================================================================
	// DISABLED STATE
	// ============================================================================

	describe("disabled state", () => {
		it("trigger is disabled when disabled prop is true", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} disabled={true} />);

			expect(screen.getByRole("combobox")).toBeDisabled();
		});
	});

	// ============================================================================
	// REF METHODS
	// ============================================================================

	describe("ref methods", () => {
		it("ref.clear() clears all selections and calls onValueChange with empty array", () => {
			const onValueChange = vi.fn();
			const ref = React.createRef<MultiSelectRef>();

			render(
				<MultiSelect
					ref={ref}
					options={OPTIONS}
					onValueChange={onValueChange}
					defaultValue={["rouge", "bleu"]}
				/>,
			);

			act(() => {
				ref.current?.clear();
			});

			expect(onValueChange).toHaveBeenCalledWith([]);
		});

		it("ref.getSelectedValues() returns the current selected values", () => {
			const ref = React.createRef<MultiSelectRef>();

			render(
				<MultiSelect
					ref={ref}
					options={OPTIONS}
					onValueChange={vi.fn()}
					defaultValue={["rouge", "vert"]}
				/>,
			);

			const values = ref.current?.getSelectedValues();
			expect(values).toEqual(["rouge", "vert"]);
		});
	});

	// ============================================================================
	// LIVE REGIONS
	// ============================================================================

	describe("live regions", () => {
		it("selected count live region shows count when values are selected", () => {
			render(
				<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge", "bleu"]} />,
			);

			// The sr-only live region announces the count
			const countRegion = screen.getByText(/2 options sélectionnées/i);
			expect(countRegion).toBeInTheDocument();
		});

		it("selected count live region shows Aucune option sélectionnée when empty", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={[]} />);

			expect(screen.getByText("Aucune option sélectionnée")).toBeInTheDocument();
		});
	});
});
