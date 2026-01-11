"use client";

import { Progress } from "@/shared/components/ui/progress";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

interface UploadProgressProps {
	/** Pourcentage de progression (0-100) */
	progress: number;
	/** Variante d'affichage */
	variant?: "default" | "compact";
	/** Classes CSS additionnelles */
	className?: string;
	/** Si true, affiche "Traitement..." même à 100% (traitement serveur en cours) */
	isProcessing?: boolean;
}

/**
 * Composant d'affichage de la progression d'upload.
 * Utilisé dans les zones de dépôt de médias.
 *
 * Fonctionnalités:
 * - Accessibilité complète (aria-live, role, aria-busy)
 * - Support reduced-motion
 * - État de complétion à 100%
 * - Responsive mobile/desktop
 *
 * Variantes:
 * - default: Spinner + barre de progression + pourcentage (pour dropzone vide)
 * - compact: Spinner + pourcentage uniquement (pour zone miniature dans grille)
 */
export function UploadProgress({
	progress,
	variant = "default",
	className,
	isProcessing = false,
}: UploadProgressProps) {
	const shouldReduceMotion = useReducedMotion();
	// Trois états: téléversement (0-99%), traitement (100% + isProcessing), terminé (100% + !isProcessing)
	const isComplete = progress >= 100 && !isProcessing;
	const isServerProcessing = progress >= 100 && isProcessing;

	// Texte accessible pour les lecteurs d'écran
	const srText = isComplete
		? "Téléversement terminé"
		: isServerProcessing
			? "Traitement du fichier en cours"
			: `Téléversement en cours, ${progress} pourcent`;

	if (variant === "compact") {
		return (
			<div
				role="status"
				aria-live="polite"
				aria-busy={!isComplete}
				className={cn(
					"flex flex-col items-center gap-2 sm:gap-1.5",
					className
				)}
			>
				{/* Texte pour lecteurs d'écran */}
				<span className="sr-only">{srText}</span>

				{/* Icône - Spinner ou Check */}
				{isComplete ? (
					<div className="flex items-center justify-center h-7 w-7 sm:h-5 sm:w-5 rounded-full bg-emerald-500/20">
						<Check
							className="h-4 w-4 sm:h-3 sm:w-3 text-emerald-600"
							aria-hidden="true"
						/>
					</div>
				) : (
					<Loader2
						className={cn(
							"h-7 w-7 sm:h-5 sm:w-5 text-primary",
							!shouldReduceMotion && "animate-spin"
						)}
						aria-hidden="true"
					/>
				)}

				{/* Pourcentage ou état */}
				<span
					className={cn(
						"text-sm sm:text-xs font-medium",
						isComplete ? "text-emerald-600" : "text-foreground/70",
						!isServerProcessing && "tabular-nums"
					)}
					aria-hidden="true"
				>
					{isComplete ? "OK" : isServerProcessing ? "Traitement..." : `${progress}%`}
				</span>
			</div>
		);
	}

	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy={!isComplete}
			className={cn(
				"flex flex-col items-center gap-4 sm:gap-3 w-full max-w-60 sm:max-w-50",
				className
			)}
		>
			{/* Texte pour lecteurs d'écran */}
			<span className="sr-only">{srText}</span>

			{/* Icône - Spinner ou Check */}
			{isComplete ? (
				<div className="flex items-center justify-center h-12 w-12 sm:h-10 sm:w-10 rounded-full bg-emerald-500/20">
					<Check
						className="h-6 w-6 sm:h-5 sm:w-5 text-emerald-600"
						aria-hidden="true"
					/>
				</div>
			) : (
				<Loader2
					className={cn(
						"h-10 w-10 sm:h-8 sm:w-8 text-primary",
						!shouldReduceMotion && "animate-spin"
					)}
					aria-hidden="true"
				/>
			)}

			{/* Barre de progression + texte */}
			<div className="w-full space-y-2 sm:space-y-1.5">
				<Progress
					value={progress}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progress}
					aria-label="Progression du téléversement"
					className={cn(
						"h-2 sm:h-1.5",
						isComplete && "[&>[data-slot=progress-indicator]]:bg-emerald-500"
					)}
				/>
				<p
					className={cn(
						"text-base sm:text-sm font-medium text-center",
						isComplete ? "text-emerald-600" : "text-foreground",
						!isServerProcessing && "tabular-nums"
					)}
					aria-hidden="true"
				>
					{isComplete
						? "Terminé"
						: isServerProcessing
							? "Traitement..."
							: `Téléversement... ${progress}%`}
				</p>
			</div>
		</div>
	);
}
