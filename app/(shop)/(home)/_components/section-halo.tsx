import { cn } from "@/shared/utils/cn";

const POSITIONS = {
	"top-right": "top-[5%] right-[-8%]",
	"bottom-left": "bottom-[10%] left-[-8%]",
} as const;

type SectionHaloPosition = keyof typeof POSITIONS;

/**
 * Halo radial décoratif de section — dédupe les divs halo inline des sections home.
 * La couleur suit l'accent de section (`--section-glow` posé par `data-accent`,
 * cf. app/styles/section-accents.css) et retombe sur le glow rose signature.
 * Purement décoratif (`aria-hidden`), hors flux de peinture interactive.
 */
export function SectionHalo({
	position = "top-right",
	className,
}: {
	position?: SectionHaloPosition;
	className?: string;
}) {
	return (
		<div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
			<div
				className={cn(
					"absolute h-[35vh] w-[50vw] max-w-md rounded-full opacity-50 blur-3xl",
					POSITIONS[position],
					className,
				)}
				style={{
					background:
						"radial-gradient(closest-side, var(--section-glow, var(--color-glow-pink)), transparent 70%)",
				}}
			/>
		</div>
	);
}
