import { Package } from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { IMAGE_BLUR_FALLBACK } from "@/shared/constants/images";
import { formatEuro } from "@/shared/utils/format-euro";
import type { OrderItemsCardProps } from "./types";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

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
					<Package className="size-5" aria-hidden="true" />
					Articles ({items.length})
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{items.map((item) => {
						const variant = [item.skuColor, item.skuSize, item.skuMaterial]
							.filter(Boolean)
							.join(" / ");

						const imageAlt = variant ? `${item.productTitle} - ${variant}` : item.productTitle;

						// `||` (et non `??`) : une chaine vide doit compter comme absente.
						// L'ancien `item.skuImageUrl ?? item.productImageUrl ?? ""` pouvait
						// livrer src="" a next/image (erreur runtime) quand skuImageUrl valait "".
						// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- `||` volontaire : une chaîne vide doit compter comme absente ; `??` la laisserait passer en src="" (erreur runtime next/image)
						const imageUrl = item.skuImageUrl || item.productImageUrl;

						return (
							<div key={item.id} className="flex items-start gap-4 border-b py-3 last:border-0">
								{/* Image */}
								<div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-md border">
									{imageUrl ? (
										<Image
											src={imageUrl}
											alt={imageAlt}
											fill
											sizes="80px"
											quality={IMAGE_QUALITY.STANDARD}
											className="object-cover"
											placeholder="blur"
											blurDataURL={IMAGE_BLUR_FALLBACK}
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center">
											<Package className="text-muted-foreground size-6" aria-hidden="true" />
										</div>
									)}
								</div>

								{/* Details */}
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">{item.productTitle}</p>
									{variant && <p className="text-muted-foreground text-sm">{variant}</p>}
									<p className="text-muted-foreground text-sm">Qté : {item.quantity}</p>
								</div>

								{/* Price */}
								<div className="shrink-0 text-right">
									<p className="font-medium">{formatEuro(item.price * item.quantity)}</p>
									{item.quantity > 1 && (
										<p className="text-muted-foreground text-sm">
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
						<div className="text-success flex justify-between text-sm">
							<span>Réduction</span>
							<span>-{formatEuro(discountAmount)}</span>
						</div>
					)}
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Livraison</span>
						<span>{shippingCost === 0 ? "Gratuite" : formatEuro(shippingCost)}</span>
					</div>
					{taxAmount > 0 && (
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">TVA</span>
							<span>{formatEuro(taxAmount)}</span>
						</div>
					)}
					<Separator />
					<div className="flex justify-between text-lg font-semibold">
						<span>Total</span>
						<span>{formatEuro(total)}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
