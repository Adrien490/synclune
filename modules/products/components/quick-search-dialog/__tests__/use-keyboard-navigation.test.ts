import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { createElement, type FC, type ReactNode } from "react";
import { useKeyboardNavigation } from "../use-keyboard-navigation";

// ─── Mock MutationObserver ───────────────────────────────────────────────────

class MockMutationObserver {
	private callback: MutationCallback;
	observe() {
		// Trigger refresh immediately so focusables get indexed
		this.callback([], this as unknown as MutationObserver);
	}
	disconnect() {}
	takeRecords(): MutationRecord[] {
		return [];
	}
	constructor(callback: MutationCallback) {
		this.callback = callback;
	}
}

vi.stubGlobal("MutationObserver", MockMutationObserver);

// ─── Mock scrollIntoView ─────────────────────────────────────────────────────

Element.prototype.scrollIntoView = vi.fn();

// ─── Test harness ────────────────────────────────────────────────────────────

type HookResult = ReturnType<typeof useKeyboardNavigation>;

const hookResultRef = { current: null as HookResult | null };

/**
 * Wrapper component that uses the hook and renders children inside
 * the contentRef div. Uses real React children instead of dangerouslySetInnerHTML
 * so that React preserves DOM nodes (and dynamically added attributes) across re-renders.
 */
const Harness: FC<{ children?: ReactNode }> = ({ children }) => {
	const nav = useKeyboardNavigation();
	// eslint-disable-next-line react-hooks/immutability -- test harness pattern
	hookResultRef.current = nav;
	return createElement(
		"div",
		{ ref: nav.contentRef, onKeyDown: nav.handleArrowNavigation },
		children,
	);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(key: string) {
	return { key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLDivElement>;
}

function defaultChildren() {
	return [
		createElement("button", { key: "a" }, "A"),
		createElement("a", { key: "b", href: "#" }, "B"),
		createElement("button", { key: "c" }, "C"),
	];
}

function setup(children?: ReactNode) {
	const { container } = render(createElement(Harness, null, children ?? defaultChildren()));
	const wrapper = container.firstElementChild as HTMLDivElement;
	return { container: wrapper };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useKeyboardNavigation", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("activeDescendantId is undefined initially", () => {
		setup();
		expect(hookResultRef.current!.activeDescendantId).toBeUndefined();
	});

	it("focusFirst() sets activeDescendantId to qs-nav-0", () => {
		setup();

		act(() => hookResultRef.current!.focusFirst());

		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-0");
	});

	it("ArrowDown increments active index", () => {
		setup();

		act(() => hookResultRef.current!.focusFirst());
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));

		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-1");
	});

	it("ArrowDown wraps from last to first", () => {
		setup();

		act(() => hookResultRef.current!.focusFirst());
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));
		// Now at index 2 (last), ArrowDown should wrap to 0
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));

		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-0");
	});

	it("ArrowUp decrements active index", () => {
		setup();

		act(() => hookResultRef.current!.focusFirst());
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));
		// Now at index 1, ArrowUp goes back to 0
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowUp")));

		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-0");
	});

	it("ArrowUp wraps from first to last", () => {
		setup();

		act(() => hookResultRef.current!.focusFirst());
		// At index 0, ArrowUp wraps to last (2)
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowUp")));

		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-2");
	});

	it("Home sets index to 0", () => {
		setup();

		act(() => hookResultRef.current!.focusFirst());
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));
		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-2");

		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("Home")));

		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-0");
	});

	it("End sets index to last element", () => {
		setup();

		act(() => hookResultRef.current!.focusFirst());
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("End")));

		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-2");
	});

	it("Enter calls click() on active element", () => {
		const { container } = setup();
		const clickSpy = vi.fn();
		const firstButton = container.querySelector("button")!;
		firstButton.addEventListener("click", clickSpy);

		act(() => hookResultRef.current!.focusFirst());
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("Enter")));

		expect(clickSpy).toHaveBeenCalledOnce();
	});

	it("Enter does nothing when activeIndex is -1", () => {
		const { container } = setup();
		const clickSpy = vi.fn();
		container.querySelectorAll("button, a").forEach((el) => {
			el.addEventListener("click", clickSpy);
		});

		const event = makeEvent("Enter");
		act(() => hookResultRef.current!.handleArrowNavigation(event));

		expect(clickSpy).not.toHaveBeenCalled();
		expect(event.preventDefault).not.toHaveBeenCalled();
	});

	it("resetActiveIndex() clears activeDescendantId to undefined", () => {
		setup();

		act(() => hookResultRef.current!.focusFirst());
		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-0");

		act(() => hookResultRef.current!.resetActiveIndex());
		expect(hookResultRef.current!.activeDescendantId).toBeUndefined();
	});

	it("assigns data-qsNavId and id to focusable elements", () => {
		const { container } = setup();

		const focusables = container.querySelectorAll("button, a");
		focusables.forEach((el, i) => {
			expect(el.getAttribute("data-qs-nav-id")).toBe(String(i));
			expect(el.id).toBe(`qs-nav-${i}`);
		});
	});

	it("sets data-active and aria-current on active element", () => {
		const { container } = setup();

		act(() => hookResultRef.current!.focusFirst());

		const first = container.querySelector('[data-qs-nav-id="0"]');
		expect(first?.getAttribute("data-active")).toBe("true");
		expect(first?.getAttribute("aria-current")).toBe("true");
	});

	it("clears data-active from previous element when index changes", () => {
		const { container } = setup();

		act(() => hookResultRef.current!.focusFirst());

		const first = container.querySelector('[data-qs-nav-id="0"]');
		expect(first?.getAttribute("data-active")).toBe("true");

		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));

		expect(first?.hasAttribute("data-active")).toBe(false);
		expect(first?.hasAttribute("aria-current")).toBe(false);

		const second = container.querySelector('[data-qs-nav-id="1"]');
		expect(second?.getAttribute("data-active")).toBe("true");
	});

	it("mouseover on focusable element updates active index", () => {
		const { container } = setup();

		const secondEl = container.querySelector('a[href="#"]')!;

		act(() => {
			secondEl.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
		});

		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-1");
	});

	it("ignores non-focusable mouseover targets", () => {
		setup(createElement("div", { className: "wrapper" }, createElement("button", null, "A")));

		const wrapper = hookResultRef.current!.contentRef.current!.querySelector(".wrapper")!;

		act(() => {
			wrapper.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
		});

		expect(hookResultRef.current!.activeDescendantId).toBeUndefined();
	});

	it("does nothing when container has no focusable elements", () => {
		setup(createElement("div", null, "No buttons here"));

		const event = makeEvent("ArrowDown");
		act(() => hookResultRef.current!.handleArrowNavigation(event));

		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(hookResultRef.current!.activeDescendantId).toBeUndefined();
	});
});
