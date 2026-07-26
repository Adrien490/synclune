"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

interface UseUrlParamOptions {
	/**
	 * Repartir du début de la liste quand la valeur change.
	 *
	 * Toutes les listes du projet sont en pagination **curseur** : « repartir du
	 * début » veut donc dire supprimer `cursor` + `direction`, pas poser `page=1`.
	 * Conserver un curseur en changeant le tri ou un filtre est silencieusement
	 * faux — Prisma se repositionne sur cet id dans le NOUVEL `orderBy` et
	 * `skip: 1`, ce qui rend une tranche arbitraire sans lever d'erreur.
	 *
	 * @default true
	 */
	resetPagination?: boolean;
	/**
	 * Scroll-to-top after navigation. Defaults to `false` (preserve scroll
	 * position — common for sort/filter where the user is mid-list). Set to
	 * `true` for params that change the dataset entirely (e.g. switching tabs).
	 * @default false
	 */
	scroll?: boolean;
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

	const resetPagination = options?.resetPagination ?? true;
	const scroll = options?.scroll ?? false;

	const update = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.delete(paramKey);
		if (value) params.set(paramKey, value);
		if (resetPagination) {
			params.delete("cursor");
			params.delete("direction");
		}
		startTransition(() => {
			setOptimisticValue(value);
			router.push(`?${params.toString()}`, { scroll });
		});
	};

	const clear = () => update("");

	return { value: optimisticValue, update, clear, isPending };
}
