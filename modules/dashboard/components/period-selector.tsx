"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition, Suspense, type ComponentProps } from "react";
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
	DASHBOARD_PERIODS,
	DASHBOARD_PERIODS_SHORT,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

/**
 * URL-based period selector for the admin dashboard
 * Updates ?period= search param, triggering server-side data refetch
 */
interface PeriodSelectorProps {
	/** Render full-width trigger (for mobile select variant) */
	fullWidth?: boolean;
	/** Visual variant — select dropdown (default) or inline segmented control */
	variant?: "select" | "segmented";
}

function PeriodSelectorInner({ fullWidth, variant = "select" }: PeriodSelectorProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentValue = (searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD) as DashboardPeriod;
	const [optimisticValue, setOptimisticValue] = useOptimistic<string>(currentValue);

	function handleChange(value: string) {
		if (value === optimisticValue) return;
		const params = new URLSearchParams(searchParams);

		if (value === DEFAULT_PERIOD) {
			params.delete(PERIOD_SEARCH_PARAM);
		} else {
			params.set(PERIOD_SEARCH_PARAM, value);
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
						className="grid w-full grid-cols-5 gap-0.5"
						aria-label="Période du tableau de bord"
						aria-busy={isPending || undefined}
						data-pending={isPending || undefined}
					>
						{(Object.keys(DASHBOARD_PERIODS_SHORT) as DashboardPeriod[]).map((key) => (
							<TabsTrigger
								key={key}
								value={key}
								className="min-h-9 px-1.5 text-xs"
								aria-label={DASHBOARD_PERIODS[key].label}
							>
								{DASHBOARD_PERIODS_SHORT[key]}
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
				className={fullWidth ? "w-full" : "w-36"}
				aria-label="Période du tableau de bord"
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
				{(Object.entries(DASHBOARD_PERIODS) as [DashboardPeriod, { label: string }][]).map(
					([key, config]) => (
						<SelectItem key={key} value={key}>
							{config.label}
						</SelectItem>
					),
				)}
			</SelectContent>
		</Select>
	);
}

export function PeriodSelector(props: ComponentProps<typeof PeriodSelectorInner>) {
	return (
		<Suspense fallback={null}>
			<PeriodSelectorInner {...props} />
		</Suspense>
	);
}
