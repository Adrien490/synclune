"use client";

import { Switch } from "@/shared/components/ui/switch";

interface ActiveToggleProps {
	isActive: boolean;
	onToggle: (checked: boolean) => void;
	isPending?: boolean;
	disabled?: boolean;
	activeLabel?: string;
	inactiveLabel?: string;
}

export function ActiveToggle({
	isActive,
	onToggle,
	isPending = false,
	disabled = false,
	activeLabel = "Désactiver",
	inactiveLabel = "Activer",
}: ActiveToggleProps) {
	return (
		<Switch
			checked={isActive}
			onCheckedChange={onToggle}
			disabled={isPending || disabled}
			aria-label={isActive ? activeLabel : inactiveLabel}
		/>
	);
}
