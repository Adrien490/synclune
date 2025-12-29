"use client";

import { useOptimistic, useTransition } from "react";

import { ActiveToggle } from "@/shared/components/active-toggle";
import { useUpdateProductSkuStatus } from "@/modules/skus/hooks/use-update-sku-status";
import { useRouter } from "next/navigation";

interface ProductSkuActiveToggleProps {
	skuId: string;
	isActive: boolean;
	isDefault: boolean;
}

export function ProductSkuActiveToggle({
	skuId,
	isActive,
	isDefault,
}: ProductSkuActiveToggleProps) {
	const router = useRouter();
	const [optimisticIsActive, setOptimisticIsActive] = useOptimistic(isActive);
	const [isTransitionPending, startTransition] = useTransition();

	const { isPending, toggleStatus } = useUpdateProductSkuStatus({
		onSuccess: () => {
			router.refresh();
		},
	});

	const handleToggle = (checked: boolean) => {
		// Empecher la desactivation de la variante principale
		if (isDefault && !checked) {
			return;
		}

		startTransition(() => {
			// Mise a jour optimistic immediate
			setOptimisticIsActive(checked);
			// Appel serveur
			toggleStatus(skuId, checked);
		});
	};

	const isDefaultAndActive = isDefault && optimisticIsActive;

	return (
		<ActiveToggle
			isActive={optimisticIsActive}
			onToggle={handleToggle}
			isPending={isPending || isTransitionPending}
			disabled={isDefaultAndActive}
			activeLabel={
				isDefaultAndActive
					? "La variante principale ne peut pas etre desactivee"
					: "Desactiver la variante"
			}
			inactiveLabel="Activer la variante"
		/>
	);
}
