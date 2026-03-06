"use client";

import type { ReactNode } from "react";

/**
 * Cursor glow wrapper — tracks pointer position via CSS custom properties.
 * A radial gradient pseudo-element follows the cursor on desktop.
 * Zero JS animation — only updates CSS vars on pointermove.
 */
export function CursorGlow({ children }: { children: ReactNode }) {
	return (
		<div
			className="cursor-glow-wrapper"
			onPointerMove={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
				e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
			}}
		>
			{children}
		</div>
	);
}
