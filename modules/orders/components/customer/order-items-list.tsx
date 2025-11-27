import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import Image from "next/image";
import Link from "next/link";

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

const formatPrice = (priceInCents: number) => {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(priceInCents / 100);
};

export function OrderItemsList({ items }: OrderItemsListProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">
					Articles commandés ({items.length})
				</CardTitle>
			</CardHeader>
			<CardContent>
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
								<div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
									{imageUrl ? (
										<Image
											src={imageUrl}
											alt={item.productTitle}
											fill
											className="object-cover"
											sizes="80px"
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
								<div className="text-right flex-shrink-0">
									<p className="font-semibold text-sm">
										{formatPrice(item.price * item.quantity)}
									</p>
									{item.quantity > 1 && (
										<p className="text-xs text-muted-foreground">
											{formatPrice(item.price)} / unité
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
