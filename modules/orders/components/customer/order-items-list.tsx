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
			<h2 className="text-base font-semibold flex items-center gap-2">
				<ShoppingBag className="size-4 text-muted-foreground" />
				Articles commandés ({items.length})
			</h2>
			<div className="border-t border-border/60 pt-4">
				<div className="divide-y">
					{items.map((item) => {
						const imageUrl = item.skuImageUrl || item.productImageUrl;
						const variants = [item.skuColor, item.skuMaterial, item.skuSize]
							.filter(Boolean)
							.join(" • ");

						return (
							<div
								key={item.id}
								className="flex gap-4 py-4 first:pt-0 last:pb-0"
							>
								{/* Image */}
								<div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
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
										<div className="flex h-full items-center justify-center text-muted-foreground">
											<span className="text-xs">Image</span>
										</div>
									)}
								</div>

								{/* Details */}
								<div className="flex-1 min-w-0">
									<h4 className="font-medium text-sm truncate">
										{item.productTitle}
									</h4>
									{variants && (
										<p className="text-xs text-muted-foreground mt-0.5">
											{variants}
										</p>
									)}
									<p className="text-xs text-muted-foreground mt-1">
										Quantité : {item.quantity}
									</p>
								</div>

								{/* Price */}
								<div className="text-right shrink-0">
									<p className="font-semibold text-sm">
										{formatEuro(item.price * item.quantity)}
									</p>
									{item.quantity > 1 && (
										<p className="text-xs text-muted-foreground">
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
