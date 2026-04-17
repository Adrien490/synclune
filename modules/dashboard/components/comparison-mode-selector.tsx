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
	COMPARISON_MODE_LABELS,
	COMPARISON_MODE_SEARCH_PARAM,
	DEFAULT_COMPARISON_MODE,
	type ComparisonMode,
} from "@/modules/dashboard/constants/period.constants";

interface ComparisonModeSelectorProps {
	/** Render full-width trigger (for mobile) */
	fullWidth?: boolean;
}

/**
 * URL-based comparison mode selector for the admin dashboard
 * Toggles between "previous period" and "year-over-year" comparisons.
 * Updates ?comparison= search param, triggering server-side data refetch.
 */
export function ComparisonModeSelector({ fullWidth }: ComparisonModeSelectorProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentValue = (searchParams.get(COMPARISON_MODE_SEARCH_PARAM) ??
		DEFAULT_COMPARISON_MODE) as ComparisonMode;
	const [optimisticValue, setOptimisticValue] = useOptimistic<string>(currentValue);

	function handleChange(value: string) {
		const params = new URLSearchParams(searchParams);

		if (value === DEFAULT_COMPARISON_MODE) {
			params.delete(COMPARISON_MODE_SEARCH_PARAM);
		} else {
			params.set(COMPARISON_MODE_SEARCH_PARAM, value);
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
				className={fullWidth ? "w-full" : "w-44"}
				aria-label="Mode de comparaison"
				data-pending={isPending || undefined}
			>
				<SelectValue />
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
