"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { KpiEvolution } from "./kpi-evolution";
import { KpiValue } from "./kpi-value";

/**
 * CVA variants for the visual hierarchy of KPIs
 */
const kpiCardVariants = cva(
	"relative overflow-hidden border-l-4 bg-linear-to-br via-background to-transparent can-hover:hover:shadow-xl can-hover:hover:-translate-y-1 transition-[transform,box-shadow] duration-300 group flex flex-col",
	{
		variants: {
			size: {
				featured: "min-h-45",
				default: "min-h-35",
				compact: "min-h-25",
			},
			priority: {
				critical: "border-primary/60 from-primary/10 shadow-md",
				operational: "border-info/40 from-info/5",
				alert: "border-warning/50 from-warning/5",
				info: "border-muted-foreground/30 from-muted/5",
			},
			status: {
				default: "",
				danger: "border-destructive/50 from-destructive/5",
				warning: "border-warning/50 from-warning/5",
			},
		},
		defaultVariants: {
			size: "default",
			priority: "operational",
			status: "default",
		},
	},
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
	numericValue?: number;
	suffix?: string;
	decimalPlaces?: number;
	animationDelay?: number;
	href?: string;
	tooltip?: string;
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
	const iconClassName = cn(
		"inline-flex items-center justify-center rounded-full bg-primary/15 border border-primary/20 text-primary can-hover:group-hover:bg-primary/20 can-hover:group-hover:scale-110 transition-[transform,background-color] duration-300",
		size === "featured" && "w-10 h-10",
		size === "default" && "w-8 h-8",
		size === "compact" && "w-6 h-6",
	);

	const cardContent = (
		<>
			<div
				className="bg-secondary absolute top-2 right-2 h-1 w-1 rounded-full opacity-40 transition-opacity group-hover:opacity-60"
				aria-hidden="true"
			/>

			{href && (
				<ChevronRight
					className="text-muted-foreground/70 group-hover:text-primary absolute right-3 bottom-3 h-4 w-4 transition-[transform,color] group-hover:translate-x-0.5"
					aria-hidden="true"
				/>
			)}

			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="flex items-center gap-1.5">
					<CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
					{tooltip && (
						<Tooltip>
							<TooltipTrigger asChild>
								<span
									role="img"
									tabIndex={href ? -1 : 0}
									className="text-muted-foreground/60 hover:text-muted-foreground inline-flex h-4 w-4 cursor-help items-center justify-center"
									aria-label={`Info: ${title}`}
								>
									<Info className="h-3.5 w-3.5" aria-hidden="true" />
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

				<div className="mt-2 flex flex-wrap items-center gap-1.5">
					{evolution !== undefined && (
						<KpiEvolution evolution={evolution} comparisonLabel={comparisonLabel} />
					)}
					{badge && (
						<Badge variant={badge.variant || "default"} className="text-xs font-normal">
							{badge.label}
						</Badge>
					)}
					{subtitle && (
						<p className="text-muted-foreground line-clamp-1 text-xs font-medium">{subtitle}</p>
					)}
				</div>
			</CardContent>
		</>
	);

	const cardClassName = cn(
		kpiCardVariants({ size, priority, status }),
		href &&
			"cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
	);

	const displayValue = numericValue !== undefined ? `${numericValue}${suffix || ""}` : value;
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
