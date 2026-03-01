import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { RotateCcw } from "lucide-react";

interface MediaErrorFallbackProps {
	type: "image" | "video";
	size?: "default" | "small";
	/** Callback to retry loading the media */
	onRetry?: () => void;
}

/**
 * Error display component for media (images/videos).
 * Used when a media fails to load.
 * Supports an optional retry button.
 */
export function MediaErrorFallback({ type, size = "default", onRetry }: MediaErrorFallbackProps) {
	const isSmall = size === "small";

	return (
		<div className="bg-muted flex h-full w-full items-center justify-center" role="alert">
			<div className="space-y-2 p-4 text-center">
				<p className={cn("text-muted-foreground font-medium", isSmall ? "text-[10px]" : "text-sm")}>
					{isSmall
						? "Erreur"
						: `Impossible de charger ${type === "video" ? "la vidéo" : "l'image"}`}
				</p>
				{!isSmall && (
					<>
						{onRetry ? (
							<Button variant="ghost" size="sm" onClick={onRetry} className="gap-1.5 text-xs">
								<RotateCcw className="h-3 w-3" />
								Réessayer
							</Button>
						) : (
							<p className="text-muted-foreground text-xs">Veuillez réessayer plus tard</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}
