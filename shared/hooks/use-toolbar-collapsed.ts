"use client";

import { useOptimistic, useTransition } from "react";
import { toggleToolbarCollapsed } from "@/shared/actions/toggle-toolbar-collapsed";

interface UseToolbarCollapsedOptions {
	initialCollapsed: boolean;
}

/**
 * Hook pour gérer l'état collapsé du toolbar avec optimistic UI
 *
 * @param options.initialCollapsed - État initial (depuis cookie serveur)
 * @returns isCollapsed, toggle, isPending
 */
export function useToolbarCollapsed({
	initialCollapsed,
}: UseToolbarCollapsedOptions) {
	const [isPending, startTransition] = useTransition();
	const [optimisticCollapsed, setOptimisticCollapsed] =
		useOptimistic(initialCollapsed);

	const toggle = () => {
		const newValue = !optimisticCollapsed;
		startTransition(async () => {
			setOptimisticCollapsed(newValue);
			await toggleToolbarCollapsed(newValue);
		});
	};

	return {
		isCollapsed: optimisticCollapsed,
		toggle,
		isPending,
	};
}
