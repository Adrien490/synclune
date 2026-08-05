import {
	HandDrawnAccent,
	HandDrawnUnderline,
} from "@/shared/components/animations/hand-drawn-accent";
import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";

/**
 * ⚠️ `arrow` a été PURGÉ (lot 0, audit HandDrawnAccent 2026-08-05) : le variant
 * n'avait aucun call site, mais son path, son type et ses dimensions étaient
 * entretenus à trois étages. Ne pas le ré-introduire sans consommateur.
 */
export type SectionAccent = "star" | "circle" | "heart";

const ACCENT_COLOR_MAP: Record<SectionAccent, string> = {
	star: "var(--secondary)",
	circle: "var(--primary)",
	heart: "var(--primary)",
};

/**
 * Largeur rendue de chaque glyphe — la hauteur est dérivée du ratio natif par
 * le composant (l'ancien couple width×height letterboxait dès qu'il déviait).
 */
const ACCENT_WIDTHS: Record<SectionAccent, number> = {
	star: 22,
	circle: 22,
	heart: 22,
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
	return (
		<div className="flex flex-col items-start gap-1">
			<div className="flex items-center gap-2">
				<HandDrawnAccent
					variant={accent}
					color={ACCENT_COLOR_MAP[accent]}
					width={ACCENT_WIDTHS[accent]}
					strokeWidth={HAND_DRAWN_STROKES.fin}
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
				strokeWidth={HAND_DRAWN_STROKES.trait}
				className="mt-0 ml-7 opacity-70"
				inView
			/>
		</div>
	);
}
