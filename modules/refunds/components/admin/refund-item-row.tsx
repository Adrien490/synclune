"use client";

import type { OrderItemForRefund } from "@/modules/refunds/data/get-order-for-refund";
import type { RefundItemValue } from "@/modules/refunds/types/refund.types";
import { getAvailableQuantity } from "@/modules/refunds/hooks/use-create-refund-form";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { formatEuro } from "@/shared/utils/format-euro";
import Image from "next/image";

interface RefundItemRowProps {
	orderItem: OrderItemForRefund;
	itemState?: RefundItemValue;
	isPending: boolean;
	onToggle: (orderItemId: string, checked: boolean) => void;
	onQuantityChange: (orderItemId: string, quantity: number) => void;
	onRestockToggle: (orderItemId: string, restock: boolean) => void;
}

export function RefundItemRow({
	orderItem,
	itemState,
	isPending,
	onToggle,
	onQuantityChange,
	onRestockToggle,
}: RefundItemRowProps) {
	const availableQty = getAvailableQuantity(orderItem);
	const isSelected = itemState?.selected ?? false;
	const quantity = itemState?.quantity ?? 0;
	const restock = itemState?.restock ?? true;
	const imageUrl = orderItem.skuImageUrl || orderItem.productImageUrl;

	const variantParts = [orderItem.skuColor, orderItem.skuMaterial, orderItem.skuSize].filter(
		Boolean,
	);

	return (
		<div className="flex items-start gap-4 rounded-lg border p-4">
			<Checkbox
				id={`item-${orderItem.id}`}
				checked={isSelected}
				onCheckedChange={(checked) => onToggle(orderItem.id, Boolean(checked))}
				disabled={isPending || availableQty === 0}
			/>

			{imageUrl && (
				<div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
					<Image
						src={imageUrl}
						alt={orderItem.productTitle}
						fill
						sizes="64px"
						className="object-cover"
					/>
				</div>
			)}

			<div className="min-w-0 flex-1">
				<Label htmlFor={`item-${orderItem.id}`} className="cursor-pointer text-sm font-medium">
					{orderItem.productTitle}
				</Label>
				{variantParts.length > 0 && (
					<p className="text-muted-foreground mt-0.5 text-xs">{variantParts.join(" / ")}</p>
				)}
				<p className="mt-1 text-sm">
					{formatEuro(orderItem.price)} x {orderItem.quantity}
				</p>
				{availableQty < orderItem.quantity && (
					<p className="text-warning-foreground mt-1 text-xs">
						{orderItem.quantity - availableQty} déjà remboursé(s)
					</p>
				)}
			</div>

			{isSelected && availableQty > 0 && (
				<div className="flex flex-col items-end gap-2">
					<div className="flex items-center gap-2">
						<Label htmlFor={`qty-${orderItem.id}`} className="text-muted-foreground text-xs">
							Quantité
						</Label>
						<Input
							id={`qty-${orderItem.id}`}
							type="number"
							min={1}
							max={availableQty}
							value={quantity}
							onChange={(e) =>
								onQuantityChange(
									orderItem.id,
									Math.max(1, Math.min(availableQty, Number(e.target.value))),
								)
							}
							className="h-8 w-16 text-center"
							disabled={isPending}
						/>
					</div>
					<div className="flex items-center gap-2">
						<Label htmlFor={`restock-${orderItem.id}`} className="text-muted-foreground text-xs">
							Remettre en stock
						</Label>
						<Switch
							id={`restock-${orderItem.id}`}
							checked={restock}
							onCheckedChange={(checked) => onRestockToggle(orderItem.id, checked)}
							disabled={isPending}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
