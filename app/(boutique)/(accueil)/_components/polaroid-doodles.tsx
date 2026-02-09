import { cn } from "@/shared/utils/cn";

// SVG path data from shared/components/animations/hand-drawn-accent.tsx
const PATHS = {
	heart: {
		d: "M25 45 Q5 30, 5 18 Q5 5, 15 5 Q25 5, 25 15 Q25 5, 35 5 Q45 5, 45 18 Q45 30, 25 45",
		viewBox: "0 0 50 50",
		fill: true,
	},
	star: {
		d: "M25 2 L30 18 L48 18 L34 28 L40 45 L25 35 L10 45 L16 28 L2 18 L20 18 Z",
		viewBox: "0 0 50 50",
		fill: true,
	},
	arrow: {
		d: "M2 25 Q50 20, 90 25 M75 12 L90 25 L75 38",
		viewBox: "0 0 95 50",
		fill: false,
	},
} as const;

interface DoodleProps {
	variant: keyof typeof PATHS;
	color: string;
	width: number;
	height: number;
	delay: number;
	className?: string;
}

function Doodle({ variant, color, width, height, delay, className }: DoodleProps) {
	const config = PATHS[variant];
	return (
		<svg
			width={width}
			height={height}
			viewBox={config.viewBox}
			fill="none"
			className={cn("pointer-events-none", className)}
			aria-hidden="true"
		>
			<path
				d={config.d}
				stroke={color}
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill={config.fill ? color : "none"}
				fillOpacity={config.fill ? 0.15 : 0}
				className="doodle-draw"
				style={{
					"--path-length": "200",
					"--draw-delay": `${delay}s`,
				} as React.CSSProperties}
			/>
		</svg>
	);
}

/**
 * Decorative hand-drawn doodles around the polaroid grid.
 * Server component — uses CSS stroke-dashoffset animation instead of motion/react.
 */
export function PolaroidDoodles() {
	return (
		<>
			{/* Heart — top-left, visible on all sizes */}
			<Doodle
				variant="heart"
				color="var(--color-glow-pink)"
				width={28}
				height={28}
				delay={0.6}
				className="absolute -top-4 -left-2 sm:-top-5 sm:-left-4"
			/>

			{/* Heart — bottom-left, lavender, visible on all sizes */}
			<Doodle
				variant="heart"
				color="var(--color-glow-lavender)"
				width={24}
				height={24}
				delay={0.8}
				className="absolute -bottom-3 left-4 sm:-bottom-4 sm:left-6"
			/>

			{/* Star — bottom-right, gold, desktop only */}
			<Doodle
				variant="star"
				color="var(--color-glow-yellow)"
				width={26}
				height={26}
				delay={1.0}
				className="absolute -bottom-4 -right-3 hidden lg:block"
			/>

			{/* Arrow — between polaroid 1 and 2, desktop only */}
			<Doodle
				variant="arrow"
				color="var(--color-glow-mint)"
				width={40}
				height={22}
				delay={1.2}
				className="absolute top-1/3 left-[23%] hidden lg:block"
			/>

			{/* Star — above polaroid 3, mint, desktop only */}
			<Doodle
				variant="star"
				color="var(--color-glow-mint)"
				width={22}
				height={22}
				delay={1.4}
				className="absolute -top-5 left-[55%] hidden lg:block"
			/>
		</>
	);
}
