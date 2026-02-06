"use client";

import { useOptimistic, useTransition } from "react";

import { ActiveToggle } from "@/shared/components/active-toggle";
import { useToggleColorStatus } from "@/modules/colors/hooks/use-toggle-color-status";

interface ColorActiveToggleProps {
	colorId: string;
	isActive: boolean;
}

export function ColorActiveToggle({
	colorId,
	isActive,
}: ColorActiveToggleProps) {
	const [optimisticIsActive, setOptimisticIsActive] = useOptimistic(isActive);
	const [isTransitionPending, startTransition] = useTransition();

	const { toggleStatus, isPending } = useToggleColorStatus({
		onSuccess: () => {
			// Server state is now synchronized
		},
	});

	const handleToggle = (checked: boolean) => {
		startTransition(() => {
			// Immediate optimistic update
			setOptimisticIsActive(checked);
			// Server call
			toggleStatus(colorId, checked);
		});
	};

	return (
		<ActiveToggle
			isActive={optimisticIsActive}
			onToggle={handleToggle}
			isPending={isPending || isTransitionPending}
		/>
	);
}
