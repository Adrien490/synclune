"use client";

import type { LucideIcon } from "lucide-react";
import {
	CircleX,
	Download,
	KeyRound,
	LogOut,
	RotateCcw,
	Shield,
	Trash2,
	UserMinus,
} from "lucide-react";

import type { ActionMenuItem } from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

import { useUserActions } from "../../hooks/use-user-actions";

const ICONS: Record<string, LucideIcon> = {
	export: Download,
	logout: LogOut,
	reset: KeyRound,
	promote: Shield,
	demote: UserMinus,
	suspend: CircleX,
	unsuspend: RotateCcw,
	restore: RotateCcw,
	delete: Trash2,
};

interface UserActionsClientProps {
	user: {
		id: string;
		name: string | null;
		email: string;
		role?: string;
		deletedAt: Date | null;
		suspendedAt?: Date | null;
	};
}

export function UserActionsClient({ user }: UserActionsClientProps) {
	const { sections } = useUserActions({ user });

	const items = sections
		.filter((s) => s.key !== "navigate")
		.flatMap((section) =>
			section.items
				.filter(
					(item): item is ActionMenuItem & { onSelect: () => void } =>
						item.hidden !== true && "onSelect" in item && typeof item.onSelect === "function",
				)
				.map((item) => ({ ...item, sectionLabel: section.label })),
		);

	if (items.length === 0) {
		return null;
	}

	return (
		<section role="group" aria-label="Actions" className="flex flex-col gap-2">
			<h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
				Actions
			</h2>
			{items.map((item) => {
				const Icon = ICONS[item.key] ?? Trash2;
				const isDestructive = item.variant === "destructive";
				return (
					<Button
						key={item.key}
						variant="outline"
						size="lg"
						className={
							isDestructive
								? "text-destructive hover:text-destructive h-12 justify-start gap-3"
								: "h-12 justify-start gap-3"
						}
						disabled={item.disabled}
						onClick={() => {
							triggerHaptic(isDestructive ? "medium" : "light");
							item.onSelect();
						}}
					>
						<Icon className="size-4" aria-hidden="true" />
						{item.label}
					</Button>
				);
			})}
		</section>
	);
}
