"use client";

import { ExternalLink, Truck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { getCarrierLabel, type Carrier } from "@/modules/orders/services/carrier.service";
import { UPDATE_TRACKING_DIALOG_ID } from "../update-tracking-dialog";
import { CopyButton } from "./copy-button";
import type { OrderShippingCardProps } from "./types";

export function OrderShippingCard({ order, canUpdateTracking }: OrderShippingCardProps) {
	const updateTrackingDialog = useAlertDialog(UPDATE_TRACKING_DIALOG_ID);

	const handleUpdateTracking = () => {
		updateTrackingDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			trackingNumber: order.trackingNumber || undefined,
			trackingUrl: order.trackingUrl || undefined,
			carrier: (order.shippingCarrier as Carrier) || undefined,
			estimatedDelivery: order.estimatedDelivery || undefined,
		});
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="flex items-center gap-2">
					<Truck className="h-5 w-5" aria-hidden="true" />
					Expédition
				</CardTitle>
				{canUpdateTracking && (
					<Button variant="ghost" size="sm" onClick={handleUpdateTracking}>
						Modifier
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{order.trackingNumber && (
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-muted-foreground">
								Numéro de suivi
							</p>
							<p className="font-mono font-medium">
								{order.trackingNumber}
							</p>
							{order.shippingCarrier && (
								<p className="text-sm text-muted-foreground">
									{getCarrierLabel(order.shippingCarrier as Carrier)}
								</p>
							)}
						</div>
						<div className="flex items-center gap-2">
							<CopyButton
								text={order.trackingNumber}
								label="Numéro de suivi"
								className="h-8 w-8 p-0"
							/>
							{order.trackingUrl && (
								<Button variant="outline" size="sm" asChild>
									<a
										href={order.trackingUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										<ExternalLink className="h-4 w-4" aria-hidden="true" />
										Suivre
										<span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
									</a>
								</Button>
							)}
						</div>
					</div>
				)}
				{order.shippedAt && (
					<div>
						<p className="text-sm text-muted-foreground">
							Date d'expédition
						</p>
						<p>
							{format(order.shippedAt, "d MMMM yyyy 'à' HH'h'mm", {
								locale: fr,
							})}
						</p>
					</div>
				)}
				{order.estimatedDelivery && (
					<div>
						<p className="text-sm text-muted-foreground">
							Livraison estimée
						</p>
						<p>
							{format(order.estimatedDelivery, "d MMMM yyyy", {
								locale: fr,
							})}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
