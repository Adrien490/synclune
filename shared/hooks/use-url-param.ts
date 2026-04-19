"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

interface UseUrlParamOptions {
	/**
	 * Reset `page=1` on value change to avoid empty pages when the result set shrinks.
	 * @default true
	 */
	resetPage?: boolean;
}

/**
 * Shared base hook for single-value URL-param state (sort, select filter, etc.).
 *
 * Wraps the `useSearchParams → URLSearchParams → router.push` pattern with
 * an optimistic value and a pending state.
 */
export function useUrlParam(paramKey: string, options?: UseUrlParamOptions) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const currentValue = searchParams.get(paramKey) ?? "";
	const [optimisticValue, setOptimisticValue] = useOptimistic<string>(currentValue);

	const resetPage = options?.resetPage ?? true;

	const update = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.delete(paramKey);
		if (value) params.set(paramKey, value);
		if (resetPage) params.set("page", "1");
		startTransition(() => {
			setOptimisticValue(value);
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clear = () => update("");

	return { value: optimisticValue, update, clear, isPending };
}
