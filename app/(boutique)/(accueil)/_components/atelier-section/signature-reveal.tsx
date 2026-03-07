import { petitFormalScript } from "@/shared/styles/fonts";

/**
 * Signature "— Léane" with scroll-driven ink-flow reveal.
 *
 * Uses an SVG stroke-dashoffset animation for the em dash "drawing",
 * then the name fades in with the text-shadow-glow effect.
 *
 * Server component — CSS-only animation via scroll-driven API + fallback.
 */
export function SignatureReveal() {
	return (
		<div className="signature-reveal pt-4 text-center" aria-label="Léane">
			{/* Em dash drawn as SVG line */}
			<svg
				viewBox="0 0 30 4"
				className="signature-dash mr-1.5 mb-0.5 inline-block h-[0.15em] w-5 align-middle md:w-6"
				aria-hidden="true"
			>
				<line
					x1="0"
					y1="2"
					x2="30"
					y2="2"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					className="doodle-draw doodle-draw-scroll"
					style={
						{
							"--path-length": "30",
							"--draw-delay": "0s",
						} as React.CSSProperties
					}
				/>
			</svg>
			{/* Name appears after dash draws */}
			<span
				className={`${petitFormalScript.className} signature-name text-foreground text-shadow-glow text-base italic md:text-lg`}
			>
				Léane
			</span>
		</div>
	);
}
