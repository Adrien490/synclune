"use client";

/**
 * Animated hamburger ↔ X morph icon (3 bars → cross)
 *
 * Uses CSS transitions on SVG attributes instead of motion/react `m.line`
 * to avoid SSR hydration mismatches (motion serializes SVG attributes
 * differently during SSR vs client hydration).
 */
export function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
	return (
		<svg
			width={20}
			height={20}
			viewBox="0 0 20 20"
			fill="none"
			aria-hidden="true"
			className="text-current"
		>
			{/* Top bar → top-left to bottom-right diagonal */}
			<line
				x1={isOpen ? 4 : 3}
				x2={isOpen ? 16 : 17}
				y1={isOpen ? 4 : 5}
				y2={isOpen ? 16 : 5}
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				className="motion-safe:transition-[x1,x2,y1,y2,opacity] motion-safe:duration-300 motion-safe:ease-[var(--ease-premium)]"
			/>
			{/* Middle bar → fades out */}
			<line
				x1="3"
				x2="17"
				y1="10"
				y2="10"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				className="motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-[var(--ease-premium)]"
				opacity={isOpen ? 0 : 1}
			/>
			{/* Bottom bar → bottom-left to top-right diagonal */}
			<line
				x1={isOpen ? 4 : 3}
				x2={isOpen ? 16 : 17}
				y1={isOpen ? 16 : 15}
				y2={isOpen ? 4 : 15}
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				className="motion-safe:transition-[x1,x2,y1,y2,opacity] motion-safe:duration-300 motion-safe:ease-[var(--ease-premium)]"
			/>
		</svg>
	);
}
