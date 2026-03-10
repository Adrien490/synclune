import { Separator } from "@/shared/components/ui/separator";
import { formatEuro } from "@/shared/utils/format-euro";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderSummaryCardProps {
	order: {
		orderNumber: string;
		createdAt: Date;
		subtotal: number;
		discountAmount: number;
		discountUsages?: { discountCode: string; amountApplied: number }[];
		shippingCost: number;
		total: number;
		currency: string;
		paymentMethod?: string | null;
	};
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
	return (
		<section className="space-y-4">
			<h2 className="text-base font-semibold">Récapitulatif</h2>
			<div className="border-border/60 space-y-4 border-t pt-4">
				{/* Order info */}
				<div className="space-y-1 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">N° de commande</span>
						<span className="font-medium tabular-nums">{order.orderNumber}</span>
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
							<span>
								Réduction
								{order.discountUsages &&
									order.discountUsages.length > 0 &&
									` (${order.discountUsages.map((d) => d.discountCode).join(", ")})`}
							</span>
							<span>-{formatEuro(order.discountAmount)}</span>
						</div>
					)}
					<div className="flex justify-between">
						<span className="text-muted-foreground">Livraison</span>
						<span>{order.shippingCost === 0 ? "Offerte" : formatEuro(order.shippingCost)}</span>
					</div>
				</div>

				<Separator />

				{/* Total */}
				<div className="flex items-center justify-between">
					<span className="font-semibold">Total</span>
					<span className="text-lg font-bold">{formatEuro(order.total)}</span>
				</div>
			</div>
		</section>
	);
}
