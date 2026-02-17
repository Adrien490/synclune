import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { formatEuro } from "@/shared/utils/format-euro";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Receipt } from "lucide-react";

interface OrderSummaryCardProps {
	order: {
		orderNumber: string;
		createdAt: Date;
		subtotal: number;
		discountAmount: number;
		shippingCost: number;
		total: number;
		currency: string;
		paymentMethod?: string | null;
		estimatedDelivery?: Date | null;
	};
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg flex items-center gap-2">
					<Receipt className="h-5 w-5" />
					Récapitulatif
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Order info */}
				<div className="space-y-1 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">N° de commande</span>
						<span className="tabular-nums font-medium">{order.orderNumber}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Date</span>
						<span>{format(order.createdAt, "d MMMM yyyy", { locale: fr })}</span>
					</div>
					{order.paymentMethod && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Paiement</span>
							<span className="capitalize">{order.paymentMethod}</span>
						</div>
					)}
					{order.estimatedDelivery && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Livraison estimée</span>
							<span>{format(order.estimatedDelivery, "d MMMM yyyy", { locale: fr })}</span>
						</div>
					)}
				</div>

				<Separator />

				{/* Prices */}
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Sous-total</span>
						<span>{formatEuro(order.subtotal)}</span>
					</div>
					{order.discountAmount > 0 && (
						<div className="flex justify-between text-green-600">
							<span>Réduction</span>
							<span>-{formatEuro(order.discountAmount)}</span>
						</div>
					)}
					<div className="flex justify-between">
						<span className="text-muted-foreground">Livraison</span>
						<span>
							{order.shippingCost === 0
								? "Offerte"
								: formatEuro(order.shippingCost)}
						</span>
					</div>
				</div>

				<Separator />

				{/* Total */}
				<div className="flex justify-between items-center">
					<span className="font-semibold">Total</span>
					<span className="text-lg font-bold">{formatEuro(order.total)}</span>
				</div>
			</CardContent>
		</Card>
	);
}
