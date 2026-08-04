"use client";

import { ArrowSquareOutIcon, TruckIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { estimateDeliveryDate } from "@/modules/orders/services/shipping.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { getCarrierLabel, type Carrier } from "@/modules/orders/utils/carrier.utils";
import { UPDATE_TRACKING_DIALOG_ID } from "../update-tracking-dialog";
import { CopyButton } from "@/shared/components/copy-button";
import { DetailInfoList, DetailInfoRow } from "@/shared/components/admin/detail-info-row";
import type { OrderShippingCardProps } from "./types";

export function OrderShippingCard({ order, canUpdateTracking }: OrderShippingCardProps) {
	const updateTrackingDialog = useAlertDialog(UPDATE_TRACKING_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const handleUpdateTracking = () => {
		if (isMobile) {
			router.push(`/admin/ventes/commandes/${order.id}/suivi`);
		} else {
			updateTrackingDialog.open({
				orderId: order.id,
				orderNumber: order.orderNumber,
				trackingNumber: order.trackingNumber ?? undefined,
				trackingUrl: order.trackingUrl ?? undefined,
				carrier: order.shippingCarrier as Carrier,
			});
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="flex items-center gap-2">
					<TruckIcon className="size-5" aria-hidden="true" />
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
							<p className="text-muted-foreground text-sm">Numéro de suivi</p>
							<p className="font-medium tabular-nums">{order.trackingNumber}</p>
							{order.shippingCarrier && (
								<p className="text-muted-foreground text-sm">
									{getCarrierLabel(order.shippingCarrier as Carrier)}
								</p>
							)}
						</div>
						<div className="flex items-center gap-2">
							<CopyButton
								text={order.trackingNumber}
								label="Numéro de suivi"
								className="size-8 p-0"
							/>
							{order.trackingUrl && (
								<Button
									variant="outline"
									size="sm"
									render={
										// eslint-disable-next-line jsx-a11y/anchor-has-content -- prop `render` Base UI : le contenu accessible est porté par les enfants du Button
										<a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" />
									}
								>
									<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
									Suivre
									<span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
								</Button>
							)}
						</div>
					</div>
				)}
				{/* Le bloc « Numéro de suivi » ci-dessus n'est PAS un `DetailInfoRow` :
				    c'est une valeur + un sous-libellé transporteur + un groupe d'actions,
				    pas une paire libellé/valeur. Seules les vraies paires sont migrées. */}
				{order.shippedAt && (
					<DetailInfoList orientation="stacked">
						<DetailInfoRow label="Date d'expédition">
							{format(order.shippedAt, "d MMMM yyyy 'à' HH'h'mm", {
								locale: fr,
							})}
						</DetailInfoRow>
						{!order.actualDelivery && (
							<DetailInfoRow label="Livraison estimée">
								{format(estimateDeliveryDate(order.shippedAt, order.shippingCountry), "d MMMM yyyy", {
									locale: fr,
								})}
							</DetailInfoRow>
						)}
					</DetailInfoList>
				)}
			</CardContent>
		</Card>
	);
}
