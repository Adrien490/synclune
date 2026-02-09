import { Button } from "@/shared/components/ui/button";
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
export function MediaErrorFallback({
	type,
	size = "default",
	onRetry,
}: MediaErrorFallbackProps) {
	const isSmall = size === "small";

	return (
		<div className="w-full h-full flex items-center justify-center bg-muted">
			<div className="text-center space-y-2 p-4">
				<p
					className={`font-medium text-muted-foreground ${
						isSmall ? "text-[10px]" : "text-sm"
					}`}
				>
					{isSmall
						? "Erreur"
						: `Impossible de charger ${type === "video" ? "la vidéo" : "l'image"}`}
				</p>
				{!isSmall && (
					<>
						{onRetry ? (
							<Button
								variant="ghost"
								size="sm"
								onClick={onRetry}
								className="text-xs gap-1.5"
							>
								<RotateCcw className="w-3 h-3" />
								Réessayer
							</Button>
						) : (
							<p className="text-xs text-muted-foreground">
								Veuillez réessayer plus tard
							</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}
