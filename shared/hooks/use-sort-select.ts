"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

/**
 * Hook pour gérer le tri via URL param sortBy
 */
export function useSortSelect() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentValue = searchParams.get("sortBy") || "";

	const [optimisticValue, setOptimisticValue] =
		useOptimistic<string>(currentValue);

	const updateUrl = (params: URLSearchParams, newValue: string) => {
		startTransition(() => {
			setOptimisticValue(newValue);
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const setSort = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.delete("sortBy");

		if (value) {
			params.set("sortBy", value);
		}

		params.set("page", "1");
		updateUrl(params, value);
	};

	const clearSort = () => {
		const params = new URLSearchParams(searchParams);
		params.delete("sortBy");
		params.set("page", "1");
		updateUrl(params, "");
	};

	return {
		value: optimisticValue,
		setSort,
		clearSort,
		isPending,
	};
}
