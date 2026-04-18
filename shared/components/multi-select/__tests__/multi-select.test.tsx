import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import * as React from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMobile, mockMounted, mockHaptic, mockReducedMotion } = vi.hoisted(() => ({
	mockIsMobile: { value: false },
	mockMounted: { value: true },
	mockHaptic: { fn: vi.fn(() => true) },
	mockReducedMotion: { value: false },
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

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
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
	ArrowLeftIcon: () => <svg data-testid="icon-arrow-left" />,
	CheckIcon: () => <svg data-testid="icon-check" />,
	ChevronDown: () => <svg data-testid="icon-chevron-down" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	SearchX: () => <svg data-testid="icon-search-x" />,
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
	mockReducedMotion.value = false;
	mockHaptic.fn = vi.fn(() => true);
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

	// ============================================================================
	// HAPTIC FEEDBACK (2026 natif)
	// ============================================================================

	describe("haptic feedback", () => {
		it("fires selection haptic when opening the popover (desktop)", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));
			expect(mockHaptic.fn).toHaveBeenCalledWith("selection");
		});

		it("fires selection haptic when toggling an option", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} closeOnSelect={false} />);
			fireEvent.click(screen.getByRole("combobox"));
			mockHaptic.fn.mockClear();

			const rougeOption = screen.getByRole("option", { name: /rouge, non sélectionné/i });
			fireEvent.click(rougeOption);

			expect(mockHaptic.fn).toHaveBeenCalledWith("selection");
		});

		it("fires light haptic on clear (top-right X)", () => {
			render(
				<MultiSelect options={OPTIONS} onValueChange={vi.fn()} defaultValue={["rouge", "bleu"]} />,
			);
			mockHaptic.fn.mockClear();

			fireEvent.click(screen.getByRole("button", { name: "Effacer les 2 options sélectionnées" }));
			expect(mockHaptic.fn).toHaveBeenCalledWith("light");
		});

		it("fires light haptic when select-all toggled on", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} closeOnSelect={false} />);
			fireEvent.click(screen.getByRole("combobox"));
			mockHaptic.fn.mockClear();

			fireEvent.click(screen.getByText("(Tout sélectionner)"));
			expect(mockHaptic.fn).toHaveBeenCalledWith("light");
		});

		it("fires medium haptic on mobile Terminer button", () => {
			mockIsMobile.value = true;
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);

			fireEvent.click(screen.getByRole("combobox"));
			mockHaptic.fn.mockClear();

			fireEvent.click(screen.getByRole("button", { name: "Terminer la sélection" }));
			expect(mockHaptic.fn).toHaveBeenCalledWith("medium");
		});
	});

	// ============================================================================
	// MOBILE INPUT ATTRIBUTES (iOS/Android natif)
	// ============================================================================

	describe("mobile search input attrs", () => {
		beforeEach(() => {
			mockIsMobile.value = true;
		});

		it("has inputMode=search and enterKeyHint=search", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			expect(input).toHaveAttribute("inputMode", "search");
			expect(input).toHaveAttribute("enterKeyHint", "search");
			expect(input).toHaveAttribute("autoCapitalize", "off");
			expect(input).toHaveAttribute("autoCorrect", "off");
			expect(input).toHaveAttribute("spellCheck", "false");
		});

		it("does NOT have autoFocus on mobile drawer input", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			expect(input).not.toHaveAttribute("autoFocus");
			expect(input).not.toHaveAttribute("autofocus");
		});

		it("has data-vaul-no-drag to prevent drawer drag from input", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			expect(input).toHaveAttribute("data-vaul-no-drag");
		});
	});

	describe("desktop search input attrs", () => {
		it("has inputMode=search + enterKeyHint=search + autoFocus", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			expect(input).toHaveAttribute("inputMode", "search");
			expect(input).toHaveAttribute("enterKeyHint", "search");
			expect(input).toHaveAttribute("autoCapitalize", "off");
		});
	});

	// ============================================================================
	// KEYBOARD SHORTCUTS — Desktop power-user (P1 2026)
	// ============================================================================

	describe("keyboard shortcuts", () => {
		it("Escape with non-empty search clears the search (no close)", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			fireEvent.change(input, { target: { value: "rou" } });
			expect(input).toHaveValue("rou");

			mockHaptic.fn.mockClear();
			fireEvent.keyDown(input, { key: "Escape" });

			expect(input).toHaveValue("");
			expect(mockHaptic.fn).toHaveBeenCalledWith("light");
		});

		it("Escape with empty search does NOT fire haptic (Radix handles close)", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			mockHaptic.fn.mockClear();
			fireEvent.keyDown(input, { key: "Escape" });

			expect(mockHaptic.fn).not.toHaveBeenCalledWith("light");
		});

		it("Cmd+A toggles all options (select all when none selected)", () => {
			const onValueChange = vi.fn();
			render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} closeOnSelect={false} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			onValueChange.mockClear();
			fireEvent.keyDown(input, { key: "a", metaKey: true });

			expect(onValueChange).toHaveBeenCalledWith(["rouge", "bleu", "vert", "jaune", "violet"]);
		});

		it("Ctrl+A toggles all options (Windows/Linux shortcut)", () => {
			const onValueChange = vi.fn();
			render(<MultiSelect options={OPTIONS} onValueChange={onValueChange} closeOnSelect={false} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			onValueChange.mockClear();
			fireEvent.keyDown(input, { key: "a", ctrlKey: true });

			expect(onValueChange).toHaveBeenCalledWith(["rouge", "bleu", "vert", "jaune", "violet"]);
		});
	});

	// ============================================================================
	// EMPTY STATE — Enhanced 2026 UX
	// ============================================================================

	describe("empty state", () => {
		it("shows SearchX icon + clear-search button when search yields no results", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			fireEvent.change(input, { target: { value: "zzzzz-no-match" } });

			expect(screen.getByTestId("icon-search-x")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Effacer la recherche" })).toBeInTheDocument();
		});

		it("clicking 'Effacer la recherche' resets search and fires light haptic", () => {
			render(<MultiSelect options={OPTIONS} onValueChange={vi.fn()} />);
			fireEvent.click(screen.getByRole("combobox"));

			const input = screen.getByTestId("command-input");
			fireEvent.change(input, { target: { value: "nomatch" } });

			mockHaptic.fn.mockClear();
			fireEvent.click(screen.getByRole("button", { name: "Effacer la recherche" }));

			expect(input).toHaveValue("");
			expect(mockHaptic.fn).toHaveBeenCalledWith("light");
		});
	});

	// ============================================================================
	// REDUCED MOTION GUARDS
	// ============================================================================

	describe("prefers-reduced-motion", () => {
		it("zeroes animationDuration on selected badge when reduced-motion is on", () => {
			mockReducedMotion.value = true;
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={vi.fn()}
					defaultValue={["rouge"]}
					animation={0.5}
					animationConfig={{ badgeAnimation: "bounce", duration: 0.5 }}
				/>,
			);

			const badge = screen.getAllByTestId("badge")[0]!;
			expect(badge.getAttribute("style")).toMatch(/animation-duration:\s*0s/i);
		});

		it("keeps animationDuration when reduced-motion is off", () => {
			mockReducedMotion.value = false;
			render(
				<MultiSelect
					options={OPTIONS}
					onValueChange={vi.fn()}
					defaultValue={["rouge"]}
					animationConfig={{ badgeAnimation: "bounce", duration: 0.7 }}
				/>,
			);

			const badge = screen.getAllByTestId("badge")[0]!;
			expect(badge.getAttribute("style")).toMatch(/animation-duration:\s*0\.7s/i);
		});
	});
});
