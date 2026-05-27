import { HandDrawnAccent } from "@/shared/components/animations/hand-drawn-accent";

/**
 * Signature "— Léane" with scroll-driven ink-flow reveal.
 *
 * Uses an SVG stroke-dashoffset animation for the em dash "drawing",
 * then the name fades in with the text-shadow-glow effect + a hand-drawn
 * rose underline mirroring the brand signature accent used elsewhere
 * (cf. footer "colorés" underline).
 *
 * Server component — CSS-only animation via scroll-driven API + fallback.
 */
export function SignatureReveal() {
	return (
		<p className="signature-reveal pt-4 text-center">
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
			<span className="relative inline-block">
				<span className="font-cursive signature-name text-foreground text-shadow-glow text-lg italic md:text-xl">
					Léane
				</span>
				<HandDrawnAccent
					variant="underline"
					color="var(--primary)"
					width={70}
					height={14}
					strokeWidth={1.5}
					delay={0.6}
					inView
					className="absolute inset-x-0 -bottom-2"
				/>
			</span>
		</p>
	);
}
