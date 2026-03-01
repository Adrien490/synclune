import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";

interface OrderItem {
	id: string;
	productId: string | null;
	productTitle: string;
	productDescription: string | null;
	productImageUrl: string | null;
	skuColor: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	skuImageUrl: string | null;
	price: number;
	quantity: number;
}

interface OrderItemsListProps {
	items: OrderItem[];
}

export function OrderItemsList({ items }: OrderItemsListProps) {
	return (
		<section className="space-y-4">
			<h2 className="flex items-center gap-2 text-base font-semibold">
				<ShoppingBag className="text-muted-foreground size-4" />
				Articles commandés ({items.length})
			</h2>
			<div className="border-border/60 border-t pt-4">
				<div className="divide-y">
					{items.map((item) => {
						const imageUrl = item.skuImageUrl ?? item.productImageUrl;
						const variants = [item.skuColor, item.skuMaterial, item.skuSize]
							.filter(Boolean)
							.join(" • ");

						return (
							<div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
								{/* Image */}
								<div className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
									{imageUrl ? (
										<Image
											src={imageUrl}
											alt={item.productTitle}
											fill
											className="object-cover"
											sizes="80px"
											quality={80}
										/>
									) : (
										<div className="text-muted-foreground flex h-full items-center justify-center">
											<span className="text-xs">Image</span>
										</div>
									)}
								</div>

								{/* Details */}
								<div className="min-w-0 flex-1">
									<h4 className="truncate text-sm font-medium">{item.productTitle}</h4>
									{variants && <p className="text-muted-foreground mt-0.5 text-xs">{variants}</p>}
									<p className="text-muted-foreground mt-1 text-xs">Quantité : {item.quantity}</p>
								</div>

								{/* Price */}
								<div className="shrink-0 text-right">
									<p className="text-sm font-semibold">{formatEuro(item.price * item.quantity)}</p>
									{item.quantity > 1 && (
										<p className="text-muted-foreground text-xs">
											{formatEuro(item.price)} / unité
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
