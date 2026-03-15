import { cn } from "@/shared/utils/cn";

/**
 * Hand-drawn SVG illustrations for creative process steps.
 * Uses doodle-draw / doodle-draw-scroll CSS animations for scroll-driven drawing.
 */

interface StepIllustrationProps {
	className?: string;
}

const STROKE_PROPS = {
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	fill: "none",
};

/** Lightbulb sketch - idea/inspiration step */
export function IdeaIllustration({ className }: StepIllustrationProps) {
	return (
		<svg
			viewBox="0 0 48 48"
			className={cn("pointer-events-none", className)}
			aria-hidden="true"
			focusable="false"
		>
			{/* Bulb outline */}
			<path
				d="M24 6 C16 6, 10 12, 10 20 C10 26, 14 30, 17 33 L17 38 L31 38 L31 33 C34 30, 38 26, 38 20 C38 12, 32 6, 24 6Z"
				stroke="currentColor"
				strokeWidth={1.8}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "140", "--draw-delay": "0s" } as React.CSSProperties}
			/>
			{/* Base lines */}
			<path
				d="M18 41 L30 41 M20 44 L28 44"
				stroke="currentColor"
				strokeWidth={1.8}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "30", "--draw-delay": "0.2s" } as React.CSSProperties}
			/>
			{/* Rays */}
			<path
				d="M24 1 L24 3 M40 8 L38 10 M8 8 L10 10 M43 20 L41 20 M5 20 L7 20"
				stroke="currentColor"
				strokeWidth={1.5}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "20", "--draw-delay": "0.3s" } as React.CSSProperties}
			/>
		</svg>
	);
}

/** Pencil + palette sketch - drawing/painting step */
export function DrawingIllustration({ className }: StepIllustrationProps) {
	return (
		<svg
			viewBox="0 0 48 48"
			className={cn("pointer-events-none", className)}
			aria-hidden="true"
			focusable="false"
		>
			{/* Pencil */}
			<path
				d="M8 40 L12 28 L34 6 L40 12 L18 34 Z"
				stroke="currentColor"
				strokeWidth={1.8}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "120", "--draw-delay": "0s" } as React.CSSProperties}
			/>
			{/* Pencil tip */}
			<path
				d="M8 40 L12 28 L18 34 Z"
				stroke="currentColor"
				strokeWidth={1.5}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "40", "--draw-delay": "0.15s" } as React.CSSProperties}
			/>
			{/* Paint drops */}
			<path
				d="M36 30 Q38 34, 36 36 Q34 34, 36 30 M42 26 Q43 29, 42 30 Q41 29, 42 26"
				stroke="currentColor"
				strokeWidth={1.5}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "30", "--draw-delay": "0.3s" } as React.CSSProperties}
			/>
		</svg>
	);
}

/** Flame/oven sketch - assembly/firing step */
export function AssemblyIllustration({ className }: StepIllustrationProps) {
	return (
		<svg
			viewBox="0 0 48 48"
			className={cn("pointer-events-none", className)}
			aria-hidden="true"
			focusable="false"
		>
			{/* Flame */}
			<path
				d="M24 4 C24 4, 14 16, 14 26 C14 32, 18 38, 24 38 C30 38, 34 32, 34 26 C34 16, 24 4, 24 4Z"
				stroke="currentColor"
				strokeWidth={1.8}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "100", "--draw-delay": "0s" } as React.CSSProperties}
			/>
			{/* Inner flame */}
			<path
				d="M24 18 C24 18, 20 24, 20 28 C20 32, 22 34, 24 34 C26 34, 28 32, 28 28 C28 24, 24 18, 24 18Z"
				stroke="currentColor"
				strokeWidth={1.5}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "60", "--draw-delay": "0.2s" } as React.CSSProperties}
			/>
			{/* Base */}
			<path
				d="M10 42 L38 42 M14 42 L14 38 M34 42 L34 38"
				stroke="currentColor"
				strokeWidth={1.8}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "40", "--draw-delay": "0.3s" } as React.CSSProperties}
			/>
		</svg>
	);
}

/** Gem/jewel sketch - finishing step */
export function FinishingIllustration({ className }: StepIllustrationProps) {
	return (
		<svg
			viewBox="0 0 48 48"
			className={cn("pointer-events-none", className)}
			aria-hidden="true"
			focusable="false"
		>
			{/* Diamond top */}
			<path
				d="M8 18 L16 8 L32 8 L40 18 L24 40 Z"
				stroke="currentColor"
				strokeWidth={1.8}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "120", "--draw-delay": "0s" } as React.CSSProperties}
			/>
			{/* Crown line */}
			<path
				d="M8 18 L40 18"
				stroke="currentColor"
				strokeWidth={1.5}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "32", "--draw-delay": "0.15s" } as React.CSSProperties}
			/>
			{/* Facets */}
			<path
				d="M16 8 L20 18 L24 40 M32 8 L28 18 L24 40"
				stroke="currentColor"
				strokeWidth={1.2}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "80", "--draw-delay": "0.25s" } as React.CSSProperties}
			/>
			{/* Sparkle */}
			<path
				d="M40 6 L42 8 M44 6 L42 8 M42 4 L42 8 M42 10 L42 8"
				stroke="currentColor"
				strokeWidth={1.2}
				{...STROKE_PROPS}
				className="doodle-draw doodle-draw-scroll"
				style={{ "--path-length": "16", "--draw-delay": "0.35s" } as React.CSSProperties}
			/>
		</svg>
	);
}

/** Map step IDs to their illustration components */
export const STEP_ILLUSTRATIONS: Record<string, React.ComponentType<StepIllustrationProps>> = {
	idea: IdeaIllustration,
	drawing: DrawingIllustration,
	assembly: AssemblyIllustration,
	finishing: FinishingIllustration,
};
