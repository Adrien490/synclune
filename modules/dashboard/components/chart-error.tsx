"use client";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";
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
		<Card className={cn(CHART_STYLES.card, className)}>
			<CardContent className={CHART_STYLES.padding.card}>
				<div
					className="flex flex-col items-center justify-center text-center"
					style={{ minHeight }}
					role="alert"
					aria-live="polite"
				>
					<div className="bg-destructive/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
						<AlertCircle className="text-destructive h-6 w-6" aria-hidden="true" />
					</div>
					<h3 className="text-foreground mb-1 text-base font-semibold">{title}</h3>
					<p className="text-muted-foreground mb-4 max-w-70 text-sm">{description}</p>
					{onRetry && (
						<Button variant="outline" size="sm" onClick={onRetry} className="h-10 min-w-30 gap-2">
							<RotateCcw className="h-4 w-4" aria-hidden="true" />
							Reessayer
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
