import { Video } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface MediaTypeBadgeProps {
	type: "IMAGE" | "VIDEO";
	size?: "sm" | "md" | "lg";
	className?: string;
}

/**
 * Badge pour indiquer le type de média (VIDEO uniquement)
 * Les images n'affichent pas de badge
 * Style cohérent avec l'identité visuelle rose/doré
 */
export function MediaTypeBadge({
	type,
	size = "md",
	className,
}: MediaTypeBadgeProps) {
	// Ne rien afficher pour les images
	if (type === "IMAGE") return null;

	const sizeClasses = {
		sm: "text-xs px-2 py-1",
		md: "text-xs px-2 py-1",
		lg: "text-sm px-2.5 py-1.5",
	};

	const iconSizes = {
		sm: "w-3 h-3",
		md: "w-4 h-4",
		lg: "w-4 h-4",
	};

	return (
		<div
			className={cn(
				"bg-secondary text-secondary-foreground font-bold rounded-md shadow-lg",
				"flex items-center gap-1 pointer-events-none",
				sizeClasses[size],
				className
			)}
			aria-label="Type de média : vidéo"
		>
			<Video className={iconSizes[size]} aria-hidden="true" />
			<span>VIDEO</span>
		</div>
	);
}
