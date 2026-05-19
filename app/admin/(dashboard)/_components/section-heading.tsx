import {
	HandDrawnAccent,
	HandDrawnUnderline,
} from "@/shared/components/animations/hand-drawn-accent";

export type SectionAccent = "star" | "circle" | "arrow" | "heart";

const ACCENT_COLOR_MAP: Record<SectionAccent, string> = {
	star: "var(--secondary)",
	circle: "var(--primary)",
	arrow: "var(--secondary)",
	heart: "var(--primary)",
};

const ACCENT_DIMENSIONS: Record<SectionAccent, { width: number; height: number }> = {
	star: { width: 22, height: 22 },
	circle: { width: 22, height: 21 },
	arrow: { width: 28, height: 14 },
	heart: { width: 22, height: 22 },
};

export function SectionHeading({
	id,
	label,
	accent,
}: {
	id: string;
	label: string;
	accent: SectionAccent;
}) {
	const { width, height } = ACCENT_DIMENSIONS[accent];
	return (
		<div className="flex flex-col items-start gap-1">
			<div className="flex items-center gap-2">
				<HandDrawnAccent
					variant={accent}
					color={ACCENT_COLOR_MAP[accent]}
					width={width}
					height={height}
					strokeWidth={1.5}
					inView
				/>
				<h2
					id={id}
					className="font-display text-foreground/85 sm:text-muted-foreground text-lg font-normal tracking-tight sm:text-base sm:italic"
				>
					{label}
				</h2>
			</div>
			<HandDrawnUnderline
				width={80}
				height={14}
				strokeWidth={2}
				className="mt-0 ml-7 opacity-70"
				inView
			/>
		</div>
	);
}
