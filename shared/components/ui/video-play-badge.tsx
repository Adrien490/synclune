import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils/cn";

const videoPlayBadgeVariants = cva(
	"bg-primary/90 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30",
	{
		variants: {
			size: {
				sm: "p-2 [&>svg]:size-4",
				md: "p-2.5 [&>svg]:size-5",
				lg: "p-3 [&>svg]:size-6",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	},
);

interface VideoPlayBadgeProps extends VariantProps<typeof videoPlayBadgeVariants> {
	className?: string;
	/** Afficher le label "Vidéo" en plus de l'icône */
	showLabel?: boolean;
}

/**
 * Badge play SVG pour indiquer qu'une thumbnail est une vidéo
 * Amélioré pour une meilleure visibilité sur mobile
 */
export function VideoPlayBadge({ size, className, showLabel = false }: VideoPlayBadgeProps) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute inset-0 flex items-center justify-center",
				className,
			)}
		>
			<div className={videoPlayBadgeVariants({ size })}>
				<svg
					className="text-white drop-shadow-sm"
					fill="currentColor"
					viewBox="0 0 16 16"
					aria-hidden="true"
				>
					<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
				</svg>
			</div>
			{showLabel && (
				<span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
					Vidéo
				</span>
			)}
		</div>
	);
}
