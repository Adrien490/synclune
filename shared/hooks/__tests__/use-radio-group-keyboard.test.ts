import { cleanup, render, renderHook } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createElement, useRef, type ReactElement } from "react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import type React from "react";

afterEach(cleanup);

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

		/**
		 * @regression radio-group-keyboard-traverses-aria-disabled
		 *
		 * `focusOption` excluait `[aria-disabled="true"]` de sa requête. Un appelant
		 * qui ne passait PAS `isOptionDisabled` — pour « laisser le focus traverser
		 * les options indisponibles », ce que déclaraient les trois sélecteurs de la
		 * fiche produit — voyait donc la flèche cibler une option absente de la
		 * requête : `target === undefined`, le focus ne bougeait pas, sans message.
		 * Un cul-de-sac silencieux, et un commentaire qui affirmait l'inverse.
		 *
		 * `aria-disabled` existe précisément pour rester focusable (WCAG 1.3.1 :
		 * l'option doit être atteinte et annoncée « indisponible », seule l'action
		 * est bloquée). Seul `[disabled]` sort de la requête.
		 *
		 * Toute modification exige une review explicite.
		 */
		it("DÉPLACE le focus sur une option aria-disabled quand la traversée est demandée", async () => {
			const { container } = render(
				createElement(Harness, { tag: "button", disabledAttr: "aria-disabled" }),
			);
			// L'option `a` (index 0) est aria-disabled ; on part de `b` (index 1) et on
			// remonte d'un cran avec ArrowUp.
			const from = container.querySelector<HTMLButtonElement>('[data-option-id="b"]')!;
			const disabled = container.querySelector<HTMLButtonElement>('[data-option-id="a"]')!;
			expect(disabled).toHaveAttribute("aria-disabled", "true");

			from.focus();
			await userEvent.keyboard("{ArrowUp}");

			expect(document.activeElement).toBe(disabled);
		});

		it("n'atteint JAMAIS une option `disabled` (elle n'est pas focusable)", async () => {
			const { container } = render(
				createElement(Harness, { tag: "button", disabledAttr: "disabled" }),
			);
			const from = container.querySelector<HTMLButtonElement>('[data-option-id="b"]')!;
			const hardDisabled = container.querySelector<HTMLButtonElement>('[data-option-id="a"]')!;

			from.focus();
			await userEvent.keyboard("{ArrowUp}");

			expect(document.activeElement).not.toBe(hardDisabled);
		});
	});

	// -------------------------------------------------------------------------
	// getTabIndex — tabindex roving, opt-in
	// -------------------------------------------------------------------------

	describe("getTabIndex", () => {
		it("reste inerte quand `activeOptionId` n'est pas passé", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({ options: OPTIONS, getOptionId: (o) => o.id, onSelect: vi.fn() }),
			);

			expect(result.current.getTabIndex(OPTIONS[0]!, 0)).toBeUndefined();
			expect(result.current.getTabIndex(OPTIONS[2]!, 2)).toBeUndefined();
		});

		it("met le seul 0 sur l'option cochée", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect: vi.fn(),
					activeOptionId: "c",
				}),
			);

			expect(result.current.getTabIndex(OPTIONS[0]!, 0)).toBe(-1);
			expect(result.current.getTabIndex(OPTIONS[2]!, 2)).toBe(0);
		});

		it("retombe sur la première option quand rien n'est coché", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect: vi.fn(),
					activeOptionId: null,
				}),
			);

			expect(result.current.getTabIndex(OPTIONS[0]!, 0)).toBe(0);
			expect(result.current.getTabIndex(OPTIONS[1]!, 1)).toBe(-1);
		});

		/**
		 * Garde-fou dur : un tabindex calculé sur la seule égalité avec la sélection
		 * faisait sortir TOUT le groupe de l'ordre de tabulation dès que l'option
		 * cochée disparaissait du catalogue (défaut constaté sur le sélecteur de
		 * pièces du panier). Le groupe doit TOUJOURS garder un arrêt.
		 */
		it("garde un arrêt de tabulation même si l'option cochée n'existe plus", () => {
			const { result } = renderHook(() =>
				useRadioGroupKeyboard({
					options: OPTIONS,
					getOptionId: (o) => o.id,
					onSelect: vi.fn(),
					activeOptionId: "combo-retire-du-catalogue",
				}),
			);

			const tabIndexes = OPTIONS.map((o, i) => result.current.getTabIndex(o, i));
			expect(tabIndexes.filter((t) => t === 0)).toHaveLength(1);
			expect(tabIndexes[0]).toBe(0);
		});
	});
});
