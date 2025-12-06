"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/shared/utils/cn";

interface SparklineProps {
	/** Donnees pour le sparkline (tableau de valeurs) */
	data: { value: number }[];
	/** Couleur pour tendance positive (hausse) */
	positiveColor?: string;
	/** Couleur pour tendance negative (baisse) */
	negativeColor?: string;
	/** Hauteur en pixels */
	height?: number;
	/** Largeur (pourcentage ou pixels) */
	width?: number | string;
	/** Afficher le gradient de fond */
	showGradient?: boolean;
	/** Classe CSS additionnelle */
	className?: string;
	/** Label accessible pour le screen reader */
	ariaLabel?: string;
}

/**
 * Composant Sparkline pour afficher une tendance visuelle sur 7 jours
 * Utilise Recharts pour la coherence avec les autres charts du dashboard
 */
export function Sparkline({
	data,
	positiveColor = "var(--chart-1)",
	negativeColor = "var(--destructive)",
	height = 32,
	width = "100%",
	showGradient = true,
	className,
	ariaLabel,
}: SparklineProps) {
	// ID unique React stable pour le gradient SVG (evite hydration mismatch)
	const reactId = useId();

	// Calculer la tendance pour choisir la couleur
	const { trend, color, gradientId } = (() => {
		if (data.length < 2) {
			return { trend: "neutral" as const, color: positiveColor, gradientId: `sparkline-${reactId}` };
		}
		const first = data[0].value;
		const last = data[data.length - 1].value;
		const t = last >= first ? ("positive" as const) : ("negative" as const);
		return {
			trend: t,
			color: t === "positive" ? positiveColor : negativeColor,
			gradientId: `sparkline-${reactId}`,
		};
	})();

	// Si pas assez de donnees, ne rien afficher
	if (data.length < 2) {
		return null;
	}

	// Label accessible par defaut base sur la tendance
	const defaultAriaLabel = trend === "positive"
		? "Tendance a la hausse sur 7 jours"
		: "Tendance a la baisse sur 7 jours";

	return (
		<div
			className={cn("w-full", className)}
			style={{ height, width }}
			role="img"
			aria-label={ariaLabel || defaultAriaLabel}
		>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={color} stopOpacity={0.3} />
							<stop offset="100%" stopColor={color} stopOpacity={0.05} />
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={1.5}
						fill={showGradient ? `url(#${gradientId})` : "transparent"}
						dot={false}
						isAnimationActive={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
