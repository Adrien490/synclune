"use client";

import { useOptimistic, useTransition } from "react";

import { ActiveToggle } from "@/shared/components/active-toggle";
import { useToggleProductTypeStatus } from "@/modules/product-types/hooks/use-toggle-product-type-status";

interface ProductTypeActiveToggleProps {
	productTypeId: string;
	isActive: boolean;
	isSystem?: boolean;
}

export function ProductTypeActiveToggle({
	productTypeId,
	isActive,
	isSystem = false,
}: ProductTypeActiveToggleProps) {
	const [optimisticIsActive, setOptimisticIsActive] = useOptimistic(isActive);
	const [isTransitionPending, startTransition] = useTransition();

	const { toggleStatus, isPending } = useToggleProductTypeStatus();

	const handleToggle = (checked: boolean) => {
		startTransition(() => {
			// Mise a jour optimistic immediate
			setOptimisticIsActive(checked);
			// Appel serveur
			toggleStatus(productTypeId, checked);
		});
	};

	return (
		<ActiveToggle
			isActive={optimisticIsActive}
			onToggle={handleToggle}
			isPending={isPending || isTransitionPending}
			disabled={isSystem}
		/>
	);
}
