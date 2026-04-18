export interface SplitTextCSSProps {
	children: string;
	/** Stagger delay between words (ms) */
	stagger?: number;
	className?: string;
}

/**
 * CSS-only word-by-word staggered reveal animation.
 *
 * Server component — no "use client", no motion/react dependency.
 * Designed for LCP-critical text (hero headings) where JS-driven
 * animations add unnecessary bundle weight and render delay.
 *
 * - Each word gets `animation-delay` via CSS custom property `--i`
 * - No opacity:0 in initial state — text is visible during SSR for LCP
 * - Reduced motion: animation disabled via CSS media query
 */
export function SplitTextCSS({ children, stagger = 80, className }: SplitTextCSSProps) {
	const words = children.split(" ");

	return (
		<span className={className} role="group" aria-label={children}>
			{words.map((word, i) => (
				<span
					key={`${word}-${i}`}
					className="animate-split-text-reveal inline-block"
					style={
						{
							"--i": i,
							"--stagger": `${stagger}ms`,
						} as React.CSSProperties
					}
					aria-hidden="true"
				>
					{word}
					{i < words.length - 1 && "\u00A0"}
				</span>
			))}
		</span>
	);
}
