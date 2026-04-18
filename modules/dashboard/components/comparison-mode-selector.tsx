"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import {
	COMPARISON_MODE_LABELS,
	COMPARISON_MODE_SEARCH_PARAM,
	DEFAULT_COMPARISON_MODE,
	type ComparisonMode,
} from "@/modules/dashboard/constants/period.constants";

/** Short labels for the segmented control (must fit ~90px each on 390px viewport) */
const COMPARISON_MODE_SHORT_LABELS: Record<ComparisonMode, string> = {
	previous: "Précédente",
	yoy: "N-1",
};

interface ComparisonModeSelectorProps {
	/** Render full-width trigger (for mobile) */
	fullWidth?: boolean;
	/** Visual variant — select dropdown (default) or inline segmented control */
	variant?: "select" | "segmented";
}

/**
 * URL-based comparison mode selector for the admin dashboard
 * Toggles between "previous period" and "year-over-year" comparisons.
 * Updates ?comparison= search param, triggering server-side data refetch.
 *
 * - `variant="select"` (default) — dropdown, used in the desktop `PageHeader` toolbar.
 * - `variant="segmented"` — 2-column Tabs, used in the mobile `DashboardPeriodSheet`.
 *   Faster to switch, more discoverable, reduces mobile chrome height.
 */
export function ComparisonModeSelector({
	fullWidth,
	variant = "select",
}: ComparisonModeSelectorProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentValue = (searchParams.get(COMPARISON_MODE_SEARCH_PARAM) ??
		DEFAULT_COMPARISON_MODE) as ComparisonMode;
	const [optimisticValue, setOptimisticValue] = useOptimistic<string>(currentValue);

	function handleChange(value: string) {
		if (value === optimisticValue) return;
		const params = new URLSearchParams(searchParams);

		if (value === DEFAULT_COMPARISON_MODE) {
			params.delete(COMPARISON_MODE_SEARCH_PARAM);
		} else {
			params.set(COMPARISON_MODE_SEARCH_PARAM, value);
		}

		triggerHaptic("selection");

		startTransition(() => {
			setOptimisticValue(value);
			const query = params.toString();
			router.push(query ? `?${query}` : ".", { scroll: false });
		});
	}

	if (variant === "segmented") {
		return (
			<div className="relative w-full">
				<Tabs value={optimisticValue} onValueChange={handleChange} className="w-full">
					<TabsList
						className="grid w-full grid-cols-2 gap-0.5"
						aria-label="Mode de comparaison"
						aria-busy={isPending || undefined}
						data-pending={isPending || undefined}
					>
						{(Object.keys(COMPARISON_MODE_SHORT_LABELS) as ComparisonMode[]).map((key) => (
							<TabsTrigger
								key={key}
								value={key}
								className="min-h-9 px-2 text-xs"
								aria-label={COMPARISON_MODE_LABELS[key]}
							>
								{COMPARISON_MODE_SHORT_LABELS[key]}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				{isPending && (
					<Loader2
						className="text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 animate-spin"
						aria-hidden="true"
					/>
				)}
			</div>
		);
	}

	return (
		<Select value={optimisticValue} onValueChange={handleChange}>
			<SelectTrigger
				className={fullWidth ? "w-full" : "w-44"}
				aria-label="Mode de comparaison"
				aria-busy={isPending || undefined}
				data-pending={isPending || undefined}
			>
				<span className="flex items-center gap-2">
					{isPending && (
						<Loader2
							className="text-muted-foreground size-3.5 shrink-0 animate-spin"
							aria-hidden="true"
						/>
					)}
					<SelectValue />
				</span>
			</SelectTrigger>
			<SelectContent>
				{(Object.entries(COMPARISON_MODE_LABELS) as [ComparisonMode, string][]).map(
					([key, label]) => (
						<SelectItem key={key} value={key}>
							{label}
						</SelectItem>
					),
				)}
			</SelectContent>
		</Select>
	);
}
