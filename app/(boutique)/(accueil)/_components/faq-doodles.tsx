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
 * Decorative hand-drawn doodles around the FAQ accordion.
 * Server component — uses CSS stroke-dashoffset animation instead of motion/react.
 */
export function FaqDoodles() {
	return (
		<>
			{/* Heart — top-right, pink, desktop only */}
			<Doodle
				variant="heart"
				color="var(--color-glow-pink)"
				width={26}
				height={26}
				delay={0.5}
				className="absolute -top-3 -right-2 hidden lg:block"
			/>

			{/* Star — bottom-left, yellow, desktop only */}
			<Doodle
				variant="star"
				color="var(--color-glow-yellow)"
				width={24}
				height={24}
				delay={0.7}
				className="absolute -bottom-4 -left-3 hidden lg:block"
			/>
		</>
	);
}
