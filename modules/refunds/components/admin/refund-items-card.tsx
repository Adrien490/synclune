"use client";

import { Package } from "lucide-react";

import type { OrderForRefund } from "@/modules/refunds/data/get-order-for-refund";
import type { RefundItemValue } from "@/modules/refunds/types/refund.types";
import { getAvailableQuantity } from "@/modules/refunds/services/refund-calculation.service";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";

import {
	FORM_SECTION_CARD_CLASS,
	FORM_SECTION_TITLE_CLASS as MOBILE_SECTION_TITLE,
} from "@/shared/components/forms/form-section-styles";

import { RefundItemRow } from "./refund-item-row";

interface RefundItemsCardProps {
	orderItems: OrderForRefund["items"];
	itemStates: RefundItemValue[];
	isPending: boolean;
	allSelected: boolean;
	onSelectToggle: () => void;
	onItemToggle: (orderItemId: string, checked: boolean) => void;
	onQuantityChange: (orderItemId: string, quantity: number) => void;
	onRestockToggle: (orderItemId: string, checked: boolean) => void;
}

/**
 * Colonne principale du formulaire de remboursement : sélection des bijoux.
 * Calque la `CreateProductMediaCard`/`InfoCard` — chrome mobile-flat →
 * desktop-card via `FORM_SECTION_CARD_CLASS`.
 */
export function RefundItemsCard({
	orderItems,
	itemStates,
	isPending,
	allSelected,
	onSelectToggle,
	onItemToggle,
	onQuantityChange,
	onRestockToggle,
}: RefundItemsCardProps) {
	const hasRefundable = orderItems.some((oi) => getAvailableQuantity(oi) > 0);

	return (
		<Card
			role="region"
			aria-label="Bijoux à rembourser"
			className={FORM_SECTION_CARD_CLASS}
			style={{ viewTransitionName: "refund-items-card" }}
		>
			<CardHeader className="flex flex-row items-center justify-between gap-3 px-0 sm:px-0 lg:px-6">
				<div id="refund-items">
					<CardTitle className={MOBILE_SECTION_TITLE}>
						<Package className="mr-2 inline size-5 align-text-bottom" aria-hidden="true" />
						Bijoux à rembourser
					</CardTitle>
					<CardDescription>Choisis ce qui retourne à l&apos;atelier.</CardDescription>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onSelectToggle}
					disabled={isPending || !hasRefundable}
					className="touch-manipulation active:scale-[0.98] motion-safe:transition-transform"
				>
					{allSelected ? "Tout désélectionner" : "Tout sélectionner"}
				</Button>
			</CardHeader>
			<CardContent className="px-0 sm:px-0 lg:px-6">
				{!hasRefundable && (
					<p className="text-muted-foreground mb-4 text-sm">
						Tous les bijoux de cette commande ont déjà été remboursés.
					</p>
				)}
				<div className="space-y-4">
					{orderItems.map((orderItem) => (
						<RefundItemRow
							key={orderItem.id}
							orderItem={orderItem}
							itemState={itemStates.find((i) => i.orderItemId === orderItem.id)}
							isPending={isPending}
							onToggle={onItemToggle}
							onQuantityChange={onQuantityChange}
							onRestockToggle={onRestockToggle}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
