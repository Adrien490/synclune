"use client";

import { Switch } from "@/shared/components/ui/switch";
import { useToggleMaterialStatus } from "@/modules/materials/hooks/use-toggle-material-status";

interface MaterialActiveToggleProps {
	materialId: string;
	isActive: boolean;
}

export function MaterialActiveToggle({
	materialId,
	isActive,
}: MaterialActiveToggleProps) {
	const { toggleStatus, isPending } = useToggleMaterialStatus();

	const handleToggle = (checked: boolean) => {
		toggleStatus(materialId, checked);
	};

	return (
		<Switch
			checked={isActive}
			onCheckedChange={handleToggle}
			disabled={isPending}
			aria-label={isActive ? "Désactiver" : "Activer"}
		/>
	);
}
