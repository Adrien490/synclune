import { Package } from "lucide-react";
import Image from "next/image";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { formatEuro } from "@/shared/utils/format-euro";
import type { OrderItemsCardProps } from "./types";

export function OrderItemsCard({
	items,
	subtotal,
	discountAmount,
	shippingCost,
	taxAmount,
	total,
}: OrderItemsCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Package className="h-5 w-5" aria-hidden="true" />
					Articles ({items.length})
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{items.map((item) => {
						const variant = [item.skuColor, item.skuSize, item.skuMaterial]
							.filter(Boolean)
							.join(" / ");

						const imageAlt = variant
							? `${item.productTitle} - ${variant}`
							: item.productTitle;

						return (
							<div
								key={item.id}
								className="flex items-start gap-4 py-3 border-b last:border-0"
							>
								{/* Image */}
								<div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
									{item.skuImageUrl || item.productImageUrl ? (
										<Image
											src={item.skuImageUrl || item.productImageUrl || ""}
											alt={imageAlt}
											fill
											sizes="80px"
											quality={80}
											className="object-cover"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center">
											<Package className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
										</div>
									)}
								</div>

								{/* Details */}
								<div className="flex-1 min-w-0">
									<p className="font-medium truncate">{item.productTitle}</p>
									{variant && (
										<p className="text-sm text-muted-foreground">{variant}</p>
									)}
									<p className="text-sm text-muted-foreground">
										Qté : {item.quantity}
									</p>
								</div>

								{/* Price */}
								<div className="text-right shrink-0">
									<p className="font-medium">
										{formatEuro(item.price * item.quantity)}
									</p>
									{item.quantity > 1 && (
										<p className="text-sm text-muted-foreground">
											{formatEuro(item.price)} / unité
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>

				<Separator className="my-4" />

				{/* Totals */}
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Sous-total</span>
						<span>{formatEuro(subtotal)}</span>
					</div>
					{discountAmount > 0 && (
						<div className="flex justify-between text-sm text-emerald-600">
							<span>Réduction</span>
							<span>-{formatEuro(discountAmount)}</span>
						</div>
					)}
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Livraison</span>
						<span>
							{shippingCost === 0 ? "Gratuite" : formatEuro(shippingCost)}
						</span>
					</div>
					{taxAmount > 0 && (
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">TVA</span>
							<span>{formatEuro(taxAmount)}</span>
						</div>
					)}
					<Separator />
					<div className="flex justify-between font-semibold text-lg">
						<span>Total</span>
						<span>{formatEuro(total)}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
