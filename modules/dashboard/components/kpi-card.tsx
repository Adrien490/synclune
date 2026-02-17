"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { KpiEvolution } from "./kpi-evolution";
import { KpiValue } from "./kpi-value";

/**
 * CVA variants pour la hierarchie visuelle des KPIs
 */
const kpiCardVariants = cva(
	"relative overflow-hidden border-l-4 bg-linear-to-br via-background to-transparent hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col",
	{
		variants: {
			size: {
				/** KPIs principaux - CA mois, Commandes mois */
				featured: "min-h-45",
				/** KPIs standards - CA jour, Panier moyen */
				default: "min-h-35",
				/** KPIs compacts - Alertes, compteurs */
				compact: "min-h-25",
			},
			priority: {
				/** Metriques business critiques */
				critical: "border-primary/60 from-primary/10 shadow-md",
				/** Metriques operationnelles */
				operational: "border-blue-500/40 from-blue-500/5",
				/** Alertes et avertissements */
				alert: "border-amber-500/50 from-amber-500/5",
				/** Informations secondaires */
				info: "border-muted-foreground/30 from-muted/5",
			},
			status: {
				default: "",
				danger: "border-red-500/50 from-red-500/5",
				warning: "border-orange-500/50 from-orange-500/5",
			},
		},
		defaultVariants: {
			size: "default",
			priority: "operational",
			status: "default",
		},
	}
);

export interface KpiCardProps extends VariantProps<typeof kpiCardVariants> {
	title: string;
	value: string | number;
	evolution?: number;
	badge?: {
		label: string;
		variant?: "default" | "secondary" | "destructive" | "outline";
	};
	subtitle?: string;
	icon?: React.ReactNode;
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
	/** Label explicite de la periode de comparaison (ex: "vs 30j precedents") */
	comparisonLabel?: string;
}

export function KpiCard({
	title,
	value,
	evolution,
	badge,
	subtitle,
	icon,
	size = "default",
	priority = "operational",
	status = "default",
	numericValue,
	suffix,
	decimalPlaces = 0,
	animationDelay = 0,
	href,
	tooltip,
	comparisonLabel,
}: KpiCardProps) {
	// Determiner les styles d'icone selon la taille
	const iconClassName = cn(
		"inline-flex items-center justify-center rounded-full bg-primary/15 border border-primary/20 text-primary group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300",
		size === "featured" && "w-10 h-10",
		size === "default" && "w-8 h-8",
		size === "compact" && "w-6 h-6"
	);

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
								<span
									role="img"
									tabIndex={href ? -1 : 0}
									className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help"
									aria-label={`Info: ${title}`}
								>
									<Info className="w-3.5 h-3.5" aria-hidden="true" />
								</span>
							</TooltipTrigger>
							<TooltipContent side="top" className="max-w-xs">
								<p className="text-sm">{tooltip}</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
				{icon && <div className={iconClassName}>{icon}</div>}
			</CardHeader>

			<CardContent>
				<KpiValue
					value={value}
					numericValue={numericValue}
					suffix={suffix}
					decimalPlaces={decimalPlaces}
					animationDelay={animationDelay}
					size={size ?? "default"}
				/>

				<div className="flex flex-wrap items-center gap-1.5 mt-2">
					{evolution !== undefined && (
						<KpiEvolution
							evolution={evolution}
							comparisonLabel={comparisonLabel}
						/>
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
						<p className="text-xs text-muted-foreground font-medium line-clamp-1">
							{subtitle}
						</p>
					)}
				</div>
			</CardContent>
		</>
	);

	const cardClassName = cn(
		kpiCardVariants({ size, priority, status }),
		href &&
			"cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
	);

	// Generer le texte accessible pour les screen readers
	const displayValue =
		numericValue !== undefined ? `${numericValue}${suffix || ""}` : value;
	const evolutionText =
		evolution !== undefined
			? `. ${evolution >= 0 ? "En hausse" : "En baisse"} de ${Math.abs(evolution).toFixed(1)}%${comparisonLabel ? ` ${comparisonLabel}` : ""}`
			: "";
	const accessibleLabel = `${title}: ${displayValue}${evolutionText}${href ? ". Cliquer pour voir les details" : ""}`;

	if (href) {
		return (
			<Link href={href} className="block" aria-label={accessibleLabel}>
				<Card className={cardClassName}>{cardContent}</Card>
			</Link>
		);
	}

	return <Card className={cardClassName}>{cardContent}</Card>;
}
