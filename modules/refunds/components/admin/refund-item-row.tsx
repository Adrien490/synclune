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

	const variantParts = [
		orderItem.skuColor,
		orderItem.skuMaterial,
		orderItem.skuSize,
	].filter(Boolean);

	return (
		<div className="flex items-start gap-4 p-4 border rounded-lg">
			<Checkbox
				id={`item-${orderItem.id}`}
				checked={isSelected}
				onCheckedChange={(checked) => onToggle(orderItem.id, Boolean(checked))}
				disabled={isPending || availableQty === 0}
			/>

			{imageUrl && (
				<div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
					<Image
						src={imageUrl}
						alt={orderItem.productTitle}
						fill
						sizes="64px"
						className="object-cover"
					/>
				</div>
			)}

			<div className="flex-1 min-w-0">
				<Label
					htmlFor={`item-${orderItem.id}`}
					className="font-medium text-sm cursor-pointer"
				>
					{orderItem.productTitle}
				</Label>
				{variantParts.length > 0 && (
					<p className="text-xs text-muted-foreground mt-0.5">
						{variantParts.join(" / ")}
					</p>
				)}
				<p className="text-sm mt-1">
					{formatEuro(orderItem.price)} x {orderItem.quantity}
				</p>
				{availableQty < orderItem.quantity && (
					<p className="text-xs text-warning-foreground mt-1">
						{orderItem.quantity - availableQty} deja rembourse(s)
					</p>
				)}
			</div>

			{isSelected && availableQty > 0 && (
				<div className="flex flex-col gap-2 items-end">
					<div className="flex items-center gap-2">
						<Label htmlFor={`qty-${orderItem.id}`} className="text-xs text-muted-foreground">
							Quantite
						</Label>
						<Input
							id={`qty-${orderItem.id}`}
							type="number"
							min={1}
							max={availableQty}
							value={quantity}
							onChange={(e) =>
								onQuantityChange(orderItem.id, Math.max(1, Math.min(availableQty, Number(e.target.value))))
							}
							className="w-16 h-8 text-center"
							disabled={isPending}
						/>
					</div>
					<div className="flex items-center gap-2">
						<Label htmlFor={`restock-${orderItem.id}`} className="text-xs text-muted-foreground">
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
