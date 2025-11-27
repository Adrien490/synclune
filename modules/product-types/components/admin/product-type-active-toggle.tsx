"use client";

import { Switch } from "@/shared/components/ui/switch";
import { useToggleProductTypeStatus } from "@/modules/product-types/hooks/admin/use-toggle-product-type-status";

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
	const { toggleStatus, isPending } = useToggleProductTypeStatus();

	const handleToggle = (checked: boolean) => {
		toggleStatus(productTypeId, checked);
	};

	return (
		<Switch
			checked={isActive}
			onCheckedChange={handleToggle}
			disabled={isPending || isSystem}
			aria-label={isActive ? "Désactiver" : "Activer"}
		/>
	);
}
