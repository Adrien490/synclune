import { cn } from "@/shared/utils/cn";

interface VideoPlayBadgeProps {
	size?: "sm" | "md" | "lg";
	className?: string;
	/** Afficher le label "Vidéo" en plus de l'icône */
	showLabel?: boolean;
}

/**
 * Badge play SVG pour indiquer qu'une thumbnail est une vidéo
 * Amélioré pour une meilleure visibilité sur mobile
 */
export function VideoPlayBadge({
	size = "sm",
	className,
	showLabel = false,
}: VideoPlayBadgeProps) {
	const sizeClasses = {
		sm: "p-2",
		md: "p-2.5",
		lg: "p-3",
	};

	const iconSizes = {
		sm: "w-4 h-4",
		md: "w-5 h-5",
		lg: "w-6 h-6",
	};

	return (
		<div
			className={cn(
				"absolute inset-0 flex items-center justify-center pointer-events-none",
				className
			)}
		>
			<div
				className={cn(
					"bg-primary/90 backdrop-blur-sm rounded-full shadow-lg",
					"ring-2 ring-white/30",
					sizeClasses[size]
				)}
			>
				<svg
					className={cn("text-white drop-shadow-sm", iconSizes[size])}
					fill="currentColor"
					viewBox="0 0 16 16"
					aria-hidden="true"
				>
					<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
				</svg>
			</div>
			{showLabel && (
				<span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white bg-black/60 px-1.5 py-0.5 rounded">
					Vidéo
				</span>
			)}
		</div>
	);
}
