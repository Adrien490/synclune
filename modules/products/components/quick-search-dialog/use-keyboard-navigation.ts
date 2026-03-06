import { useEffect, useRef, useState } from "react";

import { FOCUSABLE_SELECTOR } from "./constants";

export function useKeyboardNavigation() {
	const [activeIndex, setActiveIndex] = useState(-1);
	const contentRef = useRef<HTMLDivElement>(null);
	const focusablesRef = useRef<HTMLElement[]>([]);

	// Cache focusable elements and refresh when DOM content changes
	useEffect(() => {
		const container = contentRef.current;
		if (!container) return;

		const refresh = () => {
			const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
			focusablesRef.current = elements;
			for (let i = 0; i < elements.length; i++) {
				const el = elements[i];
				if (!el) continue;
				el.dataset.qsNavId = String(i);
				if (!el.id) {
					el.id = `qs-nav-${i}`;
				}
			}
		};

		refresh();
		const observer = new MutationObserver(refresh);
		observer.observe(container, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, []);

	// Sync data-active attribute using cached list (O(1) swap instead of O(n) loop)
	useEffect(() => {
		const container = contentRef.current;
		if (!container) return;

		const prev = container.querySelector('[data-active="true"]');
		if (prev) {
			prev.removeAttribute("data-active");
		}
		const el = focusablesRef.current[activeIndex];
		if (el) {
			el.setAttribute("data-active", "true");
		}
	}, [activeIndex]);

	// Delegated mouseover handler using cached data-qsNavId (no querySelectorAll)
	useEffect(() => {
		const container = contentRef.current;
		if (!container) return;

		const handleMouseOver = (e: MouseEvent) => {
			const target = (e.target as HTMLElement).closest<HTMLElement>(FOCUSABLE_SELECTOR);
			if (!target || !container.contains(target)) return;

			const id = target.dataset.qsNavId;
			if (id != null) {
				setActiveIndex(Number(id));
			}
		};

		container.addEventListener("mouseover", handleMouseOver);
		return () => container.removeEventListener("mouseover", handleMouseOver);
	}, []);

	const focusFirst = () => {
		setActiveIndex(0);
		focusablesRef.current[0]?.scrollIntoView({ block: "nearest" });
	};

	const handleArrowNavigation = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const focusables = focusablesRef.current;
		if (focusables.length === 0) return;

		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				nextIndex = activeIndex < focusables.length - 1 ? activeIndex + 1 : 0;
				break;
			case "ArrowUp":
				e.preventDefault();
				nextIndex = activeIndex > 0 ? activeIndex - 1 : focusables.length - 1;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = focusables.length - 1;
				break;
			case "Enter":
				if (activeIndex >= 0 && focusables[activeIndex]) {
					e.preventDefault();
					focusables[activeIndex].click();
					return;
				}
				break;
		}

		if (nextIndex !== null) {
			setActiveIndex(nextIndex);
			focusables[nextIndex]?.scrollIntoView({ block: "nearest" });
		}
	};

	const resetActiveIndex = () => setActiveIndex(-1);

	// Derive activeDescendantId from state only (avoid reading ref during render)
	const activeDescendantId = activeIndex >= 0 ? `qs-nav-${activeIndex}` : undefined;

	return {
		contentRef,
		handleArrowNavigation,
		focusFirst,
		resetActiveIndex,
		activeDescendantId,
	};
}
