import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRovingTabIndex } from "../use-roving-tab-index";

interface Item {
	id: string;
	disabled?: boolean;
}

const enabled = (id: string): Item => ({ id });
const disabled = (id: string): Item => ({ id, disabled: true });

function pressKey<E extends HTMLElement>(
	hook: ReturnType<typeof useRovingTabIndex<Item, E>>,
	key: string,
	currentIndex: number,
) {
	let preventedDefault = false;
	const event = {
		key,
		preventDefault: () => {
			preventedDefault = true;
		},
	} as unknown as React.KeyboardEvent<E>;
	hook.onKeyDown(event, currentIndex);
	return preventedDefault;
}

describe("useRovingTabIndex", () => {
	it("starts with the first enabled index when an enabled item leads", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({ items: [enabled("a"), enabled("b")] }),
		);
		expect(result.current.focusedIndex).toBe(0);
		expect(result.current.getTabIndex(0)).toBe(0);
		expect(result.current.getTabIndex(1)).toBe(-1);
	});

	it("skips a leading disabled item on initial focus", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [disabled("a"), enabled("b"), enabled("c")],
				isDisabled: (it) => it.disabled === true,
			}),
		);
		expect(result.current.focusedIndex).toBe(1);
	});

	it("returns 0 when ALL items are disabled (no crash)", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [disabled("a"), disabled("b")],
				isDisabled: (it) => it.disabled === true,
			}),
		);
		// fallback is 0 — getTabIndex(0) returns 0 to keep a tabstop even if visually disabled
		expect(result.current.focusedIndex).toBe(0);
	});

	it("ArrowRight moves to the next enabled item", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [enabled("a"), enabled("b"), enabled("c")],
			}),
		);
		act(() => {
			pressKey(result.current, "ArrowRight", 0);
		});
		expect(result.current.focusedIndex).toBe(1);
	});

	it("ArrowLeft wraps around to the last enabled item", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [enabled("a"), enabled("b"), enabled("c")],
			}),
		);
		act(() => {
			pressKey(result.current, "ArrowLeft", 0);
		});
		expect(result.current.focusedIndex).toBe(2);
	});

	it("ArrowRight skips a disabled item in the middle", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [enabled("a"), disabled("b"), enabled("c")],
				isDisabled: (it) => it.disabled === true,
			}),
		);
		act(() => {
			pressKey(result.current, "ArrowRight", 0);
		});
		expect(result.current.focusedIndex).toBe(2);
	});

	it("Home goes to the first enabled item", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [disabled("a"), enabled("b"), enabled("c")],
				isDisabled: (it) => it.disabled === true,
			}),
		);
		act(() => {
			pressKey(result.current, "Home", 2);
		});
		expect(result.current.focusedIndex).toBe(1);
	});

	it("End goes to the last enabled item", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [enabled("a"), enabled("b"), disabled("c")],
				isDisabled: (it) => it.disabled === true,
			}),
		);
		act(() => {
			pressKey(result.current, "End", 0);
		});
		expect(result.current.focusedIndex).toBe(1);
	});

	it("orientation 'horizontal' ignores ArrowUp/ArrowDown", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [enabled("a"), enabled("b")],
				orientation: "horizontal",
			}),
		);
		const handled = pressKey(result.current, "ArrowDown", 0);
		expect(handled).toBe(false);
		expect(result.current.focusedIndex).toBe(0);
	});

	it("orientation 'vertical' ignores ArrowLeft/ArrowRight", () => {
		const { result } = renderHook(() =>
			useRovingTabIndex<Item>({
				items: [enabled("a"), enabled("b")],
				orientation: "vertical",
			}),
		);
		const handled = pressKey(result.current, "ArrowRight", 0);
		expect(handled).toBe(false);
		expect(result.current.focusedIndex).toBe(0);
	});

	it("re-aligns focusedIndex when items.length shrinks below it", () => {
		const items = [enabled("a"), enabled("b"), enabled("c"), enabled("d"), enabled("e")];
		const { result, rerender } = renderHook(
			({ list }) => useRovingTabIndex<Item>({ items: list }),
			{
				initialProps: { list: items },
			},
		);
		act(() => {
			pressKey(result.current, "End", 0);
		});
		expect(result.current.focusedIndex).toBe(4);

		rerender({ list: items.slice(0, 2) });
		// Auto-realign back into bounds.
		expect(result.current.focusedIndex).toBe(0);
	});

	it("re-aligns focusedIndex when the targeted item becomes disabled", () => {
		const initial = [enabled("a"), enabled("b"), enabled("c")];
		const { result, rerender } = renderHook(
			({ list }) =>
				useRovingTabIndex<Item>({
					items: list,
					isDisabled: (it) => it.disabled === true,
				}),
			{ initialProps: { list: initial } },
		);
		act(() => {
			pressKey(result.current, "ArrowRight", 0);
		});
		expect(result.current.focusedIndex).toBe(1);

		rerender({ list: [enabled("a"), disabled("b"), enabled("c")] });
		// "b" became disabled — focus should hop to the first enabled item.
		expect(result.current.focusedIndex).toBe(0);
	});

	it("itemRefs.current is a stable array between renders", () => {
		const { result, rerender } = renderHook(
			({ list }) => useRovingTabIndex<Item, HTMLButtonElement>({ items: list }),
			{ initialProps: { list: [enabled("a"), enabled("b")] } },
		);
		const refsBefore = result.current.itemRefs;
		rerender({ list: [enabled("a"), enabled("b"), enabled("c")] });
		expect(result.current.itemRefs).toBe(refsBefore);
	});
});
