"use client";

import { Switch } from "@/shared/components/ui/switch";
import { useUpdateProductSkuStatus } from "@/modules/skus/hooks/admin/use-update-sku-status";
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

	const { isPending, toggleStatus } = useUpdateProductSkuStatus({
		onSuccess: () => {
			router.refresh();
		},
	});

	const handleToggle = (checked: boolean) => {
		// Empêcher la désactivation de la variante principale
		if (isDefault && !checked) {
			return;
		}

		toggleStatus(skuId, checked);
	};

	return (
		<Switch
			checked={isActive}
			onCheckedChange={handleToggle}
			disabled={isPending || (isDefault && isActive)}
			aria-label={
				isDefault && isActive
					? "La variante principale ne peut pas être désactivée"
					: isActive
						? "Désactiver la variante"
						: "Activer la variante"
			}
			title={
				isDefault && isActive
					? "La variante principale ne peut pas être désactivée"
					: undefined
			}
		/>
	);
}
