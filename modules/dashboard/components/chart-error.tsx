"use client";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { AlertCircle, RotateCcw } from "lucide-react";
import { CHART_STYLES } from "../constants/chart-styles";

interface ChartErrorProps {
	/** Titre de l'erreur */
	title?: string;
	/** Description de l'erreur */
	description?: string;
	/** Callback pour reessayer */
	onRetry?: () => void;
	/** Hauteur minimum du conteneur */
	minHeight?: number;
	/** Classes CSS additionnelles */
	className?: string;
}

/**
 * Composant d'erreur pour les charts et sections du dashboard
 * Affiche un message d'erreur avec possibilite de retry
 */
export function ChartError({
	title = "Erreur de chargement",
	description = "Impossible de charger les donnees. Veuillez reessayer.",
	onRetry,
	minHeight = 250,
	className,
}: ChartErrorProps) {
	return (
		<Card className={`${CHART_STYLES.card} ${className || ""}`}>
			<CardContent className={CHART_STYLES.padding.card}>
				<div
					className="flex flex-col items-center justify-center text-center"
					style={{ minHeight }}
					role="alert"
					aria-live="polite"
				>
					<div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
						<AlertCircle className="w-6 h-6 text-destructive" aria-hidden="true" />
					</div>
					<h3 className="text-base font-semibold text-foreground mb-1">
						{title}
					</h3>
					<p className="text-sm text-muted-foreground mb-4 max-w-[280px]">
						{description}
					</p>
					{onRetry && (
						<Button
							variant="outline"
							size="sm"
							onClick={onRetry}
							className="gap-2 h-10 min-w-[120px]"
						>
							<RotateCcw className="w-4 h-4" aria-hidden="true" />
							Reessayer
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
