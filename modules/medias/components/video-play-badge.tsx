import { cn } from "@/shared/utils/cn";

interface VideoPlayBadgeProps {
	size?: "sm" | "md";
	className?: string;
}

/**
 * Badge play SVG pour indiquer qu'une thumbnail est une vidéo
 */
export function VideoPlayBadge({ size = "sm", className }: VideoPlayBadgeProps) {
	const sizeClasses = {
		sm: "p-1.5",
		md: "p-2",
	};

	const iconSizes = {
		sm: "w-3 h-3",
		md: "w-4 h-4",
	};

	return (
		<div
			className={cn(
				"absolute inset-0 flex items-center justify-center pointer-events-none",
				className
			)}
		>
			<div className={cn("bg-primary rounded-full shadow-lg", sizeClasses[size])}>
				<svg
					className={cn("text-white", iconSizes[size])}
					fill="currentColor"
					viewBox="0 0 16 16"
					aria-hidden="true"
				>
					<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
				</svg>
			</div>
		</div>
	);
}
