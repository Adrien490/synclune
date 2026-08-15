"use client";

import { DotsThreeVerticalIcon } from "@phosphor-icons/react/ssr";
import type { OrderStatus } from "@/app/generated/prisma/client";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useOrderActions } from "../../hooks/use-order-actions";

interface OrderRowActionsProps {
	orderId: string;
	orderLabel: string;
	status: OrderStatus;
}

export function OrderRowActions(props: OrderRowActionsProps) {
	const { sections } = useOrderActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="size-11 p-0 transition-transform active:scale-95"
						aria-label="Actions pour cette commande"
					/>
				}
			>
				<span className="sr-only">Ouvrir le menu d&apos;actions</span>
				<DotsThreeVerticalIcon className="size-4" />
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions commande"
				description={props.orderLabel}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
