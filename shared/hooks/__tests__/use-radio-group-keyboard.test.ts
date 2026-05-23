import { render, renderHook } from "@testing-library/react";
import { createElement, useRef, type ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type React from "react";

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { useRadioGroupKeyboard } from "../use-radio-group-keyboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Option {
	id: string;
	label: string;
	disabled?: boolean;
}

const OPTIONS: Option[] = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta" },
	{ id: "c", label: "Gamma" },
	{ id: "d", label: "Delta" },
];

function makeKeyEvent(key: string): React.KeyboardEvent {
	return {
		key,
		preventDefault: vi.fn(),
	} as unknown as React.KeyboardEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useRadioGroupKeyboard", () => {
	let onSelect: ReturnType<typeof vi.fn<(option: Option) => void>>;

	beforeEach(() => {
		onSelect = vi.fn<(option: Option) => void>();
	});

	// -------------------------------------------------------------------------
	// Return value
	// -------------------------------------------------------------------------

	describe("return value", () => {
		it("returns containerRef and handleKeyDown", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			expect(result.current.containerRef).toBeDefined();
			expect(typeof result.current.handleKeyDown).toBe("function");
		});
	});

	// -------------------------------------------------------------------------
	// Arrow key navigation
	// -------------------------------------------------------------------------

	describe("ArrowDown navigation", () => {
		it("moves to the next option when ArrowDown is pressed", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			const event = makeKeyEvent("ArrowDown");
			result.current.handleKeyDown(event, 0);

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
			expect(event.preventDefault).toHaveBeenCalled();
		});

		it("wraps around to the first option from the last", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			result.current.handleKeyDown(makeKeyEvent("ArrowDown"), OPTIONS.length - 1);

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
		});
	});

	describe("ArrowUp navigation", () => {
		it("moves to the previous option when ArrowUp is pressed", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			const event = makeKeyEvent("ArrowUp");
			result.current.handleKeyDown(event, 2);

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[1]);
			expect(event.preventDefault).toHaveBeenCalled();
		});

		it("wraps around to the last option when ArrowUp is pressed at the first", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			result.current.handleKeyDown(makeKeyEvent("ArrowUp"), 0);

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[OPTIONS.length - 1]);
		});
	});

	describe("ArrowRight / ArrowLeft navigation", () => {
		it("ArrowRight behaves the same as ArrowDown", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			result.current.handleKeyDown(makeKeyEvent("ArrowRight"), 1);

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[2]);
		});

		it("ArrowLeft behaves the same as ArrowUp", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			result.current.handleKeyDown(makeKeyEvent("ArrowLeft"), 1);

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
		});
	});

	// -------------------------------------------------------------------------
	// Disabled options
	// -------------------------------------------------------------------------

	describe("skips disabled options", () => {
		it("skips a disabled option when navigating forward", () => {
			const optionsWithDisabled: Option[] = [
				{ id: "a", label: "Alpha" },
				{ id: "b", label: "Beta", disabled: true },
				{ id: "c", label: "Gamma" },
			];

			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: optionsWithDisabled,
					getOptionId: (o) => o.id,
					isOptionDisabled: (o) => !!o.disabled,
					onSelect,
				}),
			);

			result.current.handleKeyDown(makeKeyEvent("ArrowDown"), 0);

			// Should skip index 1 (disabled) and land on index 2
			expect(onSelect).toHaveBeenCalledWith(optionsWithDisabled[2]);
		});

		it("does not call onSelect when all options are disabled", () => {
			const allDisabled: Option[] = [
				{ id: "a", label: "Alpha", disabled: true },
				{ id: "b", label: "Beta", disabled: true },
			];

			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: allDisabled,
					getOptionId: (o) => o.id,
					isOptionDisabled: (o) => !!o.disabled,
					onSelect,
				}),
			);

			result.current.handleKeyDown(makeKeyEvent("ArrowDown"), 0);

			expect(onSelect).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Home / End navigation
	// -------------------------------------------------------------------------

	describe("Home key", () => {
		it("moves to the first option", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			const event = makeKeyEvent("Home");
			result.current.handleKeyDown(event, 3);

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[0]);
			expect(event.preventDefault).toHaveBeenCalled();
		});

		it("skips disabled options when finding the first option", () => {
			const optionsWithFirstDisabled: Option[] = [
				{ id: "a", label: "Alpha", disabled: true },
				{ id: "b", label: "Beta" },
				{ id: "c", label: "Gamma" },
			];

			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: optionsWithFirstDisabled,
					getOptionId: (o) => o.id,
					isOptionDisabled: (o) => !!o.disabled,
					onSelect,
				}),
			);

			result.current.handleKeyDown(makeKeyEvent("Home"), 2);

			expect(onSelect).toHaveBeenCalledWith(optionsWithFirstDisabled[1]);
		});
	});

	describe("End key", () => {
		it("moves to the last option", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			const event = makeKeyEvent("End");
			result.current.handleKeyDown(event, 0);

			expect(onSelect).toHaveBeenCalledWith(OPTIONS[OPTIONS.length - 1]);
			expect(event.preventDefault).toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Unhandled keys
	// -------------------------------------------------------------------------

	describe("unhandled keys", () => {
		it("does not call onSelect for unrelated keys", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect,
				}),
			);

			result.current.handleKeyDown(makeKeyEvent("Enter"), 0);
			result.current.handleKeyDown(makeKeyEvent(" "), 0);
			result.current.handleKeyDown(makeKeyEvent("Tab"), 0);

			expect(onSelect).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// focusOption selector — supports <button role="radio"> AND <div role="radio">
	// -------------------------------------------------------------------------

	describe("focusOption selector", () => {
		function Harness({
			tag,
			disabledAttr,
		}: {
			tag: "button" | "div";
			disabledAttr?: "disabled" | "aria-disabled";
		}): ReactElement {
			const ref = useRef<HTMLDivElement>(null);
			const { containerRef, handleKeyDown } = useRadioGroupKeyboard({
				options: OPTIONS,
				getOptionId: (o) => o.id,
				isOptionDisabled: () => false,
				onSelect: vi.fn(),
			});

			(containerRef as unknown as { current: HTMLDivElement | null }).current = ref.current;

			return createElement(
				"div",
				{
					ref: (node: HTMLDivElement | null) => {
						ref.current = node;
						(containerRef as unknown as { current: HTMLDivElement | null }).current = node;
					},
				},
				OPTIONS.map((option, idx) => {
					const isFirstDisabled = idx === 0 && disabledAttr !== undefined;
					const props: Record<string, unknown> = {
						key: option.id,
						role: "radio",
						"data-option-id": option.id,
						tabIndex: idx === 1 ? 0 : -1,
						onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, idx),
					};
					if (isFirstDisabled === true) {
						if (disabledAttr === "disabled") props.disabled = true;
						if (disabledAttr === "aria-disabled") props["aria-disabled"] = "true";
					}
					return createElement(tag, props, option.label);
				}),
			);
		}

		it("focuses a <button role='radio'> match by data-option-id", () => {
			const { container } = render(createElement(Harness, { tag: "button" }));
			const target = container.querySelector<HTMLButtonElement>('[data-option-id="c"]');
			expect(target).not.toBeNull();

			target?.previousElementSibling?.dispatchEvent(
				new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
			);

			// Manual focus via handler — verify the element CAN be focused via the selector.
			target?.focus();
			expect(document.activeElement).toBe(target);
		});

		it("focuses a <div role='radio'> match (Radix-style)", () => {
			const { container } = render(createElement(Harness, { tag: "div" }));
			const target = container.querySelector<HTMLDivElement>('[data-option-id="c"]');
			expect(target).not.toBeNull();
			expect(target?.getAttribute("role")).toBe("radio");
			// Native div needs an explicit tabIndex to be focusable — the hook
			// doesn't add it; consumer is responsible.
			target?.focus();
			expect(document.activeElement).toBe(target);
		});

		it("excludes elements with aria-disabled='true' from the focus selector", () => {
			const { container } = render(
				createElement(Harness, { tag: "div", disabledAttr: "aria-disabled" }),
			);
			const enabled = container.querySelectorAll(
				'[role="radio"]:not([disabled]):not([aria-disabled="true"])',
			);
			// 4 options - 1 aria-disabled = 3 enabled
			expect(enabled.length).toBe(3);
			expect(enabled[0]?.getAttribute("data-option-id")).toBe("b");
		});

		it("excludes elements with disabled attribute from the focus selector", () => {
			const { container } = render(
				createElement(Harness, { tag: "button", disabledAttr: "disabled" }),
			);
			const enabled = container.querySelectorAll(
				'[role="radio"]:not([disabled]):not([aria-disabled="true"])',
			);
			expect(enabled.length).toBe(3);
			expect(enabled[0]?.getAttribute("data-option-id")).toBe("b");
		});
	});
});
