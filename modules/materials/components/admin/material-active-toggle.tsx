"use client";

import { useOptimistic, useTransition } from "react";

import { ActiveToggle } from "@/shared/components/active-toggle";
import { useToggleMaterialStatus } from "@/modules/materials/hooks/use-toggle-material-status";

interface MaterialActiveToggleProps {
	materialId: string;
	isActive: boolean;
}

export function MaterialActiveToggle({ materialId, isActive }: MaterialActiveToggleProps) {
	const [optimisticIsActive, setOptimisticIsActive] = useOptimistic(isActive);
	const [isTransitionPending, startTransition] = useTransition();

	const { toggleStatus, isPending } = useToggleMaterialStatus({
		onSuccess: () => {
			// L'etat serveur est maintenant synchronise
		},
	});

	const handleToggle = (checked: boolean) => {
		startTransition(() => {
			// Mise a jour optimistic immediate
			setOptimisticIsActive(checked);
			// Appel serveur
			toggleStatus(materialId, checked);
		});
	};

	const busy = isPending || isTransitionPending;

	return (
		<>
			<ActiveToggle isActive={optimisticIsActive} onToggle={handleToggle} isPending={busy} />
			<span className="sr-only" aria-live="polite">
				{busy
					? "Mise à jour du statut du matériau en cours"
					: optimisticIsActive
						? "Matériau activé"
						: "Matériau désactivé"}
			</span>
		</>
	);
}
