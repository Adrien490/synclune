"use client";

import { ArrowLeftRight } from "lucide-react";
import {
	COMPARISON_MODE_LABELS,
	COMPARISON_MODE_SHORT_LABELS,
	COMPARISON_SEARCH_PARAM,
	DEFAULT_COMPARISON_MODE,
	type ComparisonMode,
} from "@/modules/dashboard/constants/period.constants";
import { UrlSelectControl, type UrlSelectOption } from "./url-select-control";

/**
 * URL-based comparison-mode selector for the admin dashboard.
 * Updates ?comparison= search param, triggering server-side KPI refetch.
 * Thin wrapper over `UrlSelectControl` — the leading icon disambiguates the
 * desktop header where it sits next to the (unlabeled) period selector.
 */
interface ComparisonSelectorProps {
	/** Render full-width trigger (for mobile select variant) */
	fullWidth?: boolean;
	/** Visual variant — select dropdown (default) or inline segmented control */
	variant?: "select" | "segmented";
}

const COMPARISON_OPTIONS: UrlSelectOption[] = (
	Object.keys(COMPARISON_MODE_LABELS) as ComparisonMode[]
).map((value) => ({
	value,
	label: COMPARISON_MODE_LABELS[value],
	shortLabel: COMPARISON_MODE_SHORT_LABELS[value],
}));

export function ComparisonSelector({ fullWidth, variant }: ComparisonSelectorProps) {
	return (
		<UrlSelectControl
			options={COMPARISON_OPTIONS}
			searchParam={COMPARISON_SEARCH_PARAM}
			defaultValue={DEFAULT_COMPARISON_MODE}
			ariaLabel="Mode de comparaison"
			variant={variant}
			fullWidth={fullWidth}
			triggerWidthClassName="w-44"
			segmentedColsClassName="grid-cols-2"
			icon={
				<ArrowLeftRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
			}
		/>
	);
}
