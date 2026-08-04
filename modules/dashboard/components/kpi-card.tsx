"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { CaretRightIcon, InfoIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { KpiValue } from "./kpi-value";

/**
 * CVA variants for the visual hierarchy of KPIs
 */
const kpiCardVariants = cva(
	"relative overflow-hidden border-l-4 bg-linear-to-br via-background to-transparent can-hover:hover:shadow-xl can-hover:hover:-translate-y-1 transition-[transform,box-shadow] duration-300 group flex flex-col",
	{
		variants: {
			size: {
				featured: "min-h-45 md:backdrop-blur-sm md:backdrop-saturate-150",
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

/**
 * Mobile flat-mode overrides: strip Card chrome (border, shadow, gradient, min-h, rounded)
 * under md: breakpoint to produce a dense iOS-native presentation.
 * Chrome is re-applied at md: via md:-prefixed classes.
 */
const KPI_FLAT_MOBILE_OVERRIDES =
	"border-0 bg-none from-transparent shadow-none rounded-none min-h-0 py-3 px-0 gap-1 " +
	"md:bg-linear-to-br md:rounded-xl md:shadow-sm md:p-6 md:gap-2";

interface KpiCardProps extends VariantProps<typeof kpiCardVariants> {
	title: string;
	value: string | number;
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
	/**
	 * When true, the Card chrome (border, gradient, shadow, min-height) is stripped
	 * on mobile viewports (< md) for a flat iOS-native density. Desktop is unaffected.
	 */
	flatOnMobile?: boolean;
}

export function KpiCard({
	title,
	value,
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
	flatOnMobile = false,
}: KpiCardProps) {
	const iconClassName = cn(
		"inline-flex items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary can-hover:group-hover:bg-primary/20 can-hover:group-hover:scale-110 transition-[transform,background-color] duration-300",
		size === "featured" && "size-10",
		size === "default" && "size-8",
		size === "compact" && "size-6",
	);

	// Unique id used to expose tooltip text to AT when the card is a link
	// (the tooltip itself is bound to the Link via aria-describedby below)
	const tooltipDescriptionId = tooltip ? `kpi-tooltip-${slugify(title)}` : undefined;

	const cardContent = (
		<>
			{size === "featured" && (
				<div
					aria-hidden="true"
					className="bg-primary/20 pointer-events-none absolute -top-12 -right-12 size-40 rounded-full blur-3xl [animation-duration:4s] motion-safe:animate-pulse"
				/>
			)}
			<div
				className="bg-secondary absolute top-2 right-2 size-1 rounded-full opacity-40 transition-opacity group-hover:opacity-60"
				aria-hidden="true"
			/>

			{href && (
				/* Le chevron signale que la carte navigue : c'est une affordance, pas
				 * une décoration. `group-focus-within:` en parité du hover, sinon
				 * l'utilisateur au clavier ne reçoit pas l'indication que la souris
				 * reçoit (audit responsive 2026-07-26, P2). */
				<CaretRightIcon
					className="text-muted-foreground/70 group-hover:text-primary group-focus-within:text-primary absolute right-3 bottom-3 size-4 transition-[transform,color] group-focus-within:translate-x-0.5 group-hover:translate-x-0.5"
					aria-hidden="true"
				/>
			)}

			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div className="flex items-center gap-1.5">
					<CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
					{tooltip && !href && (
						<Tooltip>
							<TooltipTrigger
								render={
									<button
										type="button"
										className="text-muted-foreground/60 hover:text-muted-foreground focus-visible:ring-ring -m-3 inline-flex size-11 cursor-help items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
										aria-label={`Info: ${title}`}
									/>
								}
							>
								<InfoIcon className="size-3.5" aria-hidden="true" />
							</TooltipTrigger>
							<TooltipContent side="top" className="max-w-xs">
								<p className="text-sm">{tooltip}</p>
							</TooltipContent>
						</Tooltip>
					)}
					{tooltip && href && (
						<>
							<InfoIcon className="text-muted-foreground/60 size-3.5" aria-hidden="true" />
							<span id={tooltipDescriptionId} className="sr-only">
								{tooltip}
							</span>
						</>
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
					{badge && (
						<Badge variant={badge.variant ?? "default"} className="text-xs font-normal">
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
		flatOnMobile && KPI_FLAT_MOBILE_OVERRIDES,
		href && "focus-ring cursor-pointer",
	);

	const displayValue = numericValue !== undefined ? `${numericValue}${suffix ?? ""}` : value;
	const accessibleLabel = `${title}: ${displayValue}${href ? ". Cliquer pour voir les détails" : ""}`;

	if (href) {
		return (
			<Link
				href={href}
				className="block"
				aria-label={accessibleLabel}
				aria-describedby={tooltipDescriptionId}
			>
				<Card className={cardClassName}>{cardContent}</Card>
			</Link>
		);
	}

	return <Card className={cardClassName}>{cardContent}</Card>;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
