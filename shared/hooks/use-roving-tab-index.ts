"use client";

import { useRef, useState, type KeyboardEvent } from "react";

interface UseRovingTabIndexOptions<T> {
	/** Item list. The hook reacts to identity & length changes. */
	items: T[];
	/** Predicate marking an item as non-focusable. Disabled items are skipped on arrow nav. */
	isDisabled?: (item: T) => boolean;
	/** Toolbar orientation. `"both"` accepts horizontal + vertical arrows (default). */
	orientation?: "horizontal" | "vertical" | "both";
}

interface UseRovingTabIndexResult<E extends HTMLElement> {
	/** Index currently exposed as `tabIndex=0`. */
	focusedIndex: number;
	/** Returns the correct `tabIndex` for the given item index. */
	getTabIndex: (index: number) => 0 | -1;
	/** Programmatically move focus (e.g. from `onFocus`). */
	setFocusedIndex: (index: number) => void;
	/** Stable ref array — attach as `ref={(node) => { itemRefs.current[index] = node; }}`. */
	itemRefs: React.RefObject<Array<E | null>>;
	/** Keydown handler — wires Arrow*, Home, End. */
	onKeyDown: (event: KeyboardEvent<E>, currentIndex: number) => void;
}

function nextEnabledIndex<T>(
	items: T[],
	from: number,
	direction: 1 | -1,
	isDisabled: (item: T) => boolean,
): number | null {
	const count = items.length;
	if (count === 0) return null;
	let i = from;
	for (let step = 0; step < count; step++) {
		i = (i + direction + count) % count;
		const item = items[i];
		if (item !== undefined && !isDisabled(item)) return i;
	}
	return null;
}

/**
 * WAI-ARIA roving tabindex pattern for toolbars, menubars, and segmented controls.
 *
 * Handles Arrow keys (per `orientation`), Home/End, wrap-around, and disabled-item skipping.
 * Auto-realigns `focusedIndex` when `items.length` shrinks or when the currently focused
 * item becomes disabled — prevents the all-`tabIndex=-1` deadlock.
 *
 * @example
 * ```tsx
 * const { focusedIndex, getTabIndex, setFocusedIndex, itemRefs, onKeyDown } =
 *   useRovingTabIndex<MyItem, HTMLButtonElement>({ items, isDisabled: (i) => i.disabled });
 *
 * return items.map((item, index) => (
 *   <button
 *     ref={(node) => { itemRefs.current[index] = node; }}
 *     tabIndex={getTabIndex(index)}
 *     onFocus={() => setFocusedIndex(index)}
 *     onKeyDown={(e) => onKeyDown(e, index)}
 *   />
 * ));
 * ```
 */
export function useRovingTabIndex<T, E extends HTMLElement = HTMLElement>({
	items,
	isDisabled = () => false,
	orientation = "both",
}: UseRovingTabIndexOptions<T>): UseRovingTabIndexResult<E> {
	const [rawFocusedIndex, setFocusedIndexState] = useState<number>(
		() => nextEnabledIndex(items, -1, 1, isDisabled) ?? 0,
	);
	const itemRefs = useRef<Array<E | null>>([]);

	// Derived focusedIndex — clamps to a valid, enabled index without a
	// setState-in-effect. Prevents the all-`tabIndex=-1` deadlock when
	// `items.length` shrinks or the targeted item becomes disabled.
	const targeted = items[rawFocusedIndex];
	const focusedIndex =
		targeted !== undefined && !isDisabled(targeted)
			? rawFocusedIndex
			: (nextEnabledIndex(items, -1, 1, isDisabled) ?? 0);

	const acceptsHorizontal = orientation === "horizontal" || orientation === "both";
	const acceptsVertical = orientation === "vertical" || orientation === "both";

	const onKeyDown = (event: KeyboardEvent<E>, currentIndex: number) => {
		if (items.length === 0) return;
		let nextIndex: number | null = null;

		switch (event.key) {
			case "ArrowRight":
				if (acceptsHorizontal) {
					event.preventDefault();
					nextIndex = nextEnabledIndex(items, currentIndex, 1, isDisabled);
				}
				break;
			case "ArrowLeft":
				if (acceptsHorizontal) {
					event.preventDefault();
					nextIndex = nextEnabledIndex(items, currentIndex, -1, isDisabled);
				}
				break;
			case "ArrowDown":
				if (acceptsVertical) {
					event.preventDefault();
					nextIndex = nextEnabledIndex(items, currentIndex, 1, isDisabled);
				}
				break;
			case "ArrowUp":
				if (acceptsVertical) {
					event.preventDefault();
					nextIndex = nextEnabledIndex(items, currentIndex, -1, isDisabled);
				}
				break;
			case "Home":
				event.preventDefault();
				nextIndex = nextEnabledIndex(items, -1, 1, isDisabled);
				break;
			case "End":
				event.preventDefault();
				nextIndex = nextEnabledIndex(items, 0, -1, isDisabled);
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndexState(nextIndex);
			itemRefs.current[nextIndex]?.focus();
		}
	};

	return {
		focusedIndex,
		getTabIndex: (index) => (focusedIndex === index ? 0 : -1),
		setFocusedIndex: setFocusedIndexState,
		itemRefs,
		onKeyDown,
	};
}
