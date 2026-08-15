"use client";

import { Switch } from "@/shared/components/ui/switch";

interface ActiveToggleProps {
	active: boolean;
	onToggle: (checked: boolean) => void;
	isPending?: boolean;
	disabled?: boolean;
	activeLabel?: string;
	inactiveLabel?: string;
}

export function ActiveToggle({
	active,
	onToggle,
	isPending = false,
	disabled = false,
	activeLabel = "Désactiver",
	inactiveLabel = "Activer",
}: ActiveToggleProps) {
	return (
		<Switch
			checked={active}
			onCheckedChange={onToggle}
			disabled={isPending || disabled}
			aria-label={active ? activeLabel : inactiveLabel}
		/>
	);
}
