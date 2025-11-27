interface MediaErrorFallbackProps {
	type: "image" | "video";
	size?: "default" | "small";
}

/**
 * Composant d'affichage d'erreur pour les médias (images/vidéos)
 * Utilisé quand un média échoue au chargement
 */
export function MediaErrorFallback({
	type,
	size = "default",
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
					<p className="text-xs text-muted-foreground">
						Veuillez réessayer plus tard
					</p>
				)}
			</div>
		</div>
	);
}
