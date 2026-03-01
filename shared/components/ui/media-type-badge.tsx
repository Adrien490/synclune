import { cva, type VariantProps } from "class-variance-authority";
import { Video } from "lucide-react";
import { cn } from "@/shared/utils/cn";

const mediaTypeBadgeVariants = cva(
	"bg-secondary text-secondary-foreground font-bold rounded-md shadow-lg flex items-center gap-1 pointer-events-none",
	{
		variants: {
			size: {
				sm: "text-xs px-2 py-1 [&>svg]:size-3",
				md: "text-xs px-2 py-1 [&>svg]:size-4",
				lg: "text-sm px-2.5 py-1.5 [&>svg]:size-4",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

interface MediaTypeBadgeProps extends VariantProps<typeof mediaTypeBadgeVariants> {
	type: "IMAGE" | "VIDEO";
	className?: string;
}

/**
 * Badge pour indiquer le type de média (VIDEO uniquement)
 * Les images n'affichent pas de badge
 * Style cohérent avec l'identité visuelle rose/doré
 */
export function MediaTypeBadge({ type, size, className }: MediaTypeBadgeProps) {
	if (type === "IMAGE") return null;

	return (
		<div
			className={cn(mediaTypeBadgeVariants({ size }), className)}
			aria-label="Type de média : vidéo"
		>
			<Video aria-hidden="true" />
			<span>VIDÉO</span>
		</div>
	);
}
