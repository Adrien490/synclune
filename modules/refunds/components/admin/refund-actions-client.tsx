"use client";

import type { LucideIcon } from "lucide-react";
import { Check, CircleX, CreditCard, Trash2 } from "lucide-react";

import type { RefundStatus } from "@/app/generated/prisma/browser";
import type { ActionMenuItem } from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

import { useRefundActions } from "../../hooks/use-refund-actions";

const ICONS: Record<string, LucideIcon> = {
	approve: Check,
	process: CreditCard,
	reject: CircleX,
	cancel: Trash2,
};

interface RefundActionsClientProps {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		orderId: string;
		orderNumber: string;
	};
}

export function RefundActionsClient({ refund }: RefundActionsClientProps) {
	const { sections } = useRefundActions({ refund });

	const items = sections
		.flatMap((section) => section.items)
		.filter(
			(item): item is ActionMenuItem & { onSelect: () => void } =>
				item.hidden !== true && "onSelect" in item && typeof item.onSelect === "function",
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
				const Icon = ICONS[item.key] ?? Check;
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
