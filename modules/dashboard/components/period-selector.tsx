"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import {
	DASHBOARD_PERIODS,
	DEFAULT_PERIOD,
	PERIOD_SEARCH_PARAM,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";

/**
 * URL-based period selector for the admin dashboard
 * Updates ?period= search param, triggering server-side data refetch
 */
export function PeriodSelector() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentValue = (searchParams.get(PERIOD_SEARCH_PARAM) ?? DEFAULT_PERIOD) as DashboardPeriod;
	const [optimisticValue, setOptimisticValue] = useOptimistic<string>(currentValue);

	function handleChange(value: string) {
		const params = new URLSearchParams(searchParams);

		if (value === DEFAULT_PERIOD) {
			params.delete(PERIOD_SEARCH_PARAM);
		} else {
			params.set(PERIOD_SEARCH_PARAM, value);
		}

		startTransition(() => {
			setOptimisticValue(value);
			const query = params.toString();
			router.push(query ? `?${query}` : ".", { scroll: false });
		});
	}

	return (
		<Select value={optimisticValue} onValueChange={handleChange}>
			<SelectTrigger
				className="w-36"
				aria-label="Periode du tableau de bord"
				data-pending={isPending || undefined}
			>
				<SelectValue />
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
