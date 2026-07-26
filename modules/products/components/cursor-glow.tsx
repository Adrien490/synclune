"use client";

import "./cursor-glow.css";

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

/**
 * Cursor glow wrapper — tracks pointer position via CSS custom properties.
 * A radial gradient pseudo-element follows the cursor on desktop.
 * Zero JS animation — only updates CSS vars on pointermove.
 *
 * The element rect is cached on `pointerenter` and reused on every
 * `pointermove`: reading `getBoundingClientRect()` on each move triggers a
 * forced synchronous reflow (Lighthouse "Avoid forced reflow"). The rect is
 * invalidated on `pointerleave`; scroll/resize naturally re-cache on the
 * next enter.
 */
export function CursorGlow({ children }: { children: ReactNode }) {
	const rectRef = useRef<DOMRect | null>(null);

	function handlePointerEnter(event: ReactPointerEvent<HTMLDivElement>) {
		rectRef.current = event.currentTarget.getBoundingClientRect();
	}

	function handlePointerLeave() {
		rectRef.current = null;
	}

	function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
		const rect = rectRef.current ?? event.currentTarget.getBoundingClientRect();
		rectRef.current = rect;
		event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
		event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
	}

	return (
		<div
			className="cursor-glow-wrapper"
			onPointerEnter={handlePointerEnter}
			onPointerLeave={handlePointerLeave}
			onPointerMove={handlePointerMove}
		>
			{children}
		</div>
	);
}
