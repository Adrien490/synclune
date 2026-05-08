import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";
import { cn } from "@/shared/utils/cn";
import { KpiEvolution } from "./kpi-evolution";

interface StatRowProps {
	icon?: React.ReactNode;
	label: string;
	subtitle?: React.ReactNode;
	value: React.ReactNode;
	evolution?: number;
	comparisonLabel?: string;
	invertEvolutionColors?: boolean;
	/** Applies a success tint to the row background (e.g. notable recovery rate) */
	highlight?: boolean;
	/** If provided, the row becomes a Link with a trailing chevron */
	href?: string;
	"aria-label"?: string;
}

/**
 * iOS-style dense stat row for mobile dashboards.
 * Thin wrapper around `Item` primitives: icon | label + subtitle | value + evolution | chevron.
 */
export function StatRow({
	icon,
	label,
	subtitle,
	value,
	evolution,
	comparisonLabel,
	invertEvolutionColors = false,
	highlight = false,
	href,
	"aria-label": ariaLabel,
}: StatRowProps) {
	const rowClassName = cn(
		"w-full",
		highlight && "bg-success/5 border-success/20",
		href && "cursor-pointer",
	);

	const content = (
		<>
			{icon && <ItemMedia variant="icon">{icon}</ItemMedia>}
			<ItemContent>
				<ItemTitle className="text-muted-foreground text-xs font-medium">{label}</ItemTitle>
				{subtitle && <ItemDescription className="text-xs">{subtitle}</ItemDescription>}
			</ItemContent>
			<ItemActions className="flex-col items-end gap-0.5">
				<div className="text-foreground text-base font-semibold tabular-nums">{value}</div>
				{evolution !== undefined && (
					<KpiEvolution
						evolution={evolution}
						comparisonLabel={comparisonLabel}
						invertColors={invertEvolutionColors}
					/>
				)}
			</ItemActions>
			{href && (
				<ChevronRight
					className="text-muted-foreground/60 ml-1 size-4 shrink-0"
					aria-hidden="true"
				/>
			)}
		</>
	);

	if (href) {
		return (
			<Item asChild size="sm" className={rowClassName}>
				<Link href={href} aria-label={ariaLabel ?? `${label}`}>
					{content}
				</Link>
			</Item>
		);
	}

	return (
		<Item size="sm" className={rowClassName} role="listitem" aria-label={ariaLabel}>
			{content}
		</Item>
	);
}
