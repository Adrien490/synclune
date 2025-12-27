"use client";

import { cn } from "@/shared/utils/cn";
import { NumberTicker } from "@/shared/components/animations/animated-number";

export interface KpiValueProps {
	/** Valeur à afficher (string ou number) */
	value: string | number;
	/** Valeur numérique pour l'animation (si fournie, utilise NumberTicker) */
	numericValue?: number;
	/** Suffixe à afficher après la valeur animée (ex: " €", " %") */
	suffix?: string;
	/** Nombre de décimales pour l'animation */
	decimalPlaces?: number;
	/** Délai avant le début de l'animation (en secondes) */
	animationDelay?: number;
	/** Taille du KPI (affecte la taille de la police) */
	size?: "featured" | "default" | "compact";
}

/**
 * Composant d'affichage de la valeur d'un KPI
 * Supporte l'animation via NumberTicker ou l'affichage statique
 */
export function KpiValue({
	value,
	numericValue,
	suffix,
	decimalPlaces = 0,
	animationDelay = 0,
	size = "default",
}: KpiValueProps) {
	const valueClassName = cn(
		"font-semibold tracking-tight text-foreground",
		size === "featured" && "text-4xl",
		size === "default" && "text-3xl",
		size === "compact" && "text-2xl"
	);

	return (
		<div className={valueClassName}>
			{numericValue !== undefined ? (
				<>
					<NumberTicker
						value={numericValue}
						decimalPlaces={decimalPlaces}
						delay={animationDelay}
					/>
					{suffix}
				</>
			) : (
				value
			)}
		</div>
	);
}
