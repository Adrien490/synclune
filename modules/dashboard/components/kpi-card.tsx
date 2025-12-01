"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ArrowDown, ArrowUp, ChevronRight, Info } from "lucide-react";
import { NumberTicker } from "@/shared/components/ui/number-ticker";
import Link from "next/link";
import { CHART_STYLES } from "../constants/chart-styles";

export interface KpiCardProps {
	title: string;
	value: string | number;
	evolution?: number;
	badge?: {
		label: string;
		variant?: "default" | "secondary" | "destructive" | "outline";
	};
	subtitle?: string;
	icon?: React.ReactNode;
	/** Variante de couleur pour les alertes */
	variant?: "default" | "danger" | "warning" | "info";
	/** Valeur numerique pour l'animation (si fournie, utilise NumberTicker) */
	numericValue?: number;
	/** Suffixe a afficher apres la valeur animee (ex: " €", " %") */
	suffix?: string;
	/** Nombre de decimales pour l'animation */
	decimalPlaces?: number;
	/** Delai avant le debut de l'animation (en secondes) */
	animationDelay?: number;
	/** URL de drill-down (rend la card cliquable) */
	href?: string;
	/** Texte explicatif affiche dans un tooltip */
	tooltip?: string;
}

const variantStyles = {
	default: "border-primary/40 from-primary/5",
	danger: "border-red-500/50 from-red-500/5",
	warning: "border-orange-500/50 from-orange-500/5",
	info: "border-blue-500/50 from-blue-500/5",
};

export function KpiCard({
	title,
	value,
	evolution,
	badge,
	subtitle,
	icon,
	variant = "default",
	numericValue,
	suffix,
	decimalPlaces = 0,
	animationDelay = 0,
	href,
	tooltip,
}: KpiCardProps) {
	const cardContent = (
		<>
			{/* Particule décorative subtile */}
			<div
				className="absolute top-2 right-2 w-1 h-1 bg-secondary rounded-full opacity-40 group-hover:opacity-60 transition-opacity"
				aria-hidden="true"
			/>

			{/* Indicateur drill-down */}
			{href && (
				<ChevronRight
					className="absolute bottom-3 right-3 w-4 h-4 text-muted-foreground/70 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
					aria-hidden="true"
				/>
			)}

			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="flex items-center gap-1.5">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{title}
					</CardTitle>
					{tooltip && (
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
									aria-label={`Info: ${title}`}
								>
									<Info className="w-3.5 h-3.5" aria-hidden="true" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top" className="max-w-xs">
								<p className="text-sm">{tooltip}</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
				{icon && (
					<div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 border border-primary/20 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
						{icon}
					</div>
				)}
			</CardHeader>
			<CardContent>
				<div className="text-3xl font-semibold tracking-tight text-foreground">
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
				<div className="flex items-center gap-2 mt-2">
					{evolution !== undefined && (
						<div
							className={cn(
								"flex items-center text-xs font-medium",
								evolution >= 0 ? CHART_STYLES.evolution.positive : CHART_STYLES.evolution.negative
							)}
							aria-label={`${evolution >= 0 ? "En hausse" : "En baisse"} de ${Math.abs(evolution).toFixed(1)} pourcent`}
						>
							{evolution >= 0 ? (
								<ArrowUp className="w-3 h-3 mr-0.5" aria-hidden="true" />
							) : (
								<ArrowDown className="w-3 h-3 mr-0.5" aria-hidden="true" />
							)}
							<span className="font-semibold">{Math.abs(evolution).toFixed(1)}%</span>
						</div>
					)}
					{badge && (
						<Badge
							variant={badge.variant || "default"}
							className="text-xs font-normal"
						>
							{badge.label}
						</Badge>
					)}
					{subtitle && (
						<p className="text-xs text-muted-foreground font-medium line-clamp-1">{subtitle}</p>
					)}
				</div>
			</CardContent>
		</>
	);

	const cardClassName = cn(
		"relative overflow-hidden border-l-4 bg-gradient-to-br via-background to-transparent hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group",
		"min-h-[140px] flex flex-col", // Hauteur minimale pour éviter CLS, peut s'etendre si contenu long
		variantStyles[variant],
		href && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
	);

	// Generer le texte accessible pour les screen readers
	const displayValue = numericValue !== undefined ? `${numericValue}${suffix || ""}` : value;
	const evolutionText = evolution !== undefined
		? `. ${evolution >= 0 ? "En hausse" : "En baisse"} de ${Math.abs(evolution).toFixed(1)}%`
		: "";
	const accessibleLabel = `${title}: ${displayValue}${evolutionText}${href ? ". Cliquer pour voir les details" : ""}`;

	if (href) {
		return (
			<Link href={href} className="block" aria-label={accessibleLabel}>
				<Card className={cardClassName}>
					{cardContent}
				</Card>
			</Link>
		);
	}

	return (
		<Card className={cardClassName}>
			{cardContent}
		</Card>
	);
}
