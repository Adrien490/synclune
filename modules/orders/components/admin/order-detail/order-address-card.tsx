"use client";

import { MapPinIcon, PencilSimpleIcon, PhoneIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@/app/generated/prisma/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { CopyButton } from "@/shared/components/copy-button";
import { COUNTRY_NAMES } from "@/shared/constants/countries";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { EDIT_SHIPPING_ADDRESS_DIALOG_ID } from "../edit-shipping-address-dialog";
import type { OrderAddressCardProps } from "./types";

function getCountryLabel(code: string): string {
	return (COUNTRY_NAMES as Record<string, string | undefined>)[code] ?? code;
}

/**
 * Une seule adresse par commande. Le bloc « Facturation » a été retiré le
 * 2026-08-04 avec les 9 colonnes `Order.billing*` : en B2C de vente à distance
 * l'adresse de facturation est l'adresse de livraison, et c'est bien celle-ci
 * que le PDF imprime sous « Facturé à ». Le bouton « Modifier » du bloc
 * facturation était en outre inerte sur toute commande réelle — il se verrouille
 * dès qu'un numéro de facture existe, or il est posé dans les secondes suivant
 * le paiement.
 */
export function OrderAddressCard({ order }: OrderAddressCardProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const router = useRouter();
	const editShippingDialog = useAlertDialog(EDIT_SHIPPING_ADDRESS_DIALOG_ID);

	const canEditShipping =
		order.status !== OrderStatus.SHIPPED &&
		order.status !== OrderStatus.DELIVERED &&
		order.status !== OrderStatus.RETURNED;

	const shippingAddressText = [
		`${order.shippingFirstName} ${order.shippingLastName}`,
		order.shippingAddress1,
		order.shippingAddress2,
		`${order.shippingPostalCode} ${order.shippingCity}`,
		getCountryLabel(order.shippingCountry),
	]
		.filter(Boolean)
		.join("\n");

	const handleEditShipping = () => {
		haptic("light");
		if (isMobile) {
			router.push(`/admin/ventes/commandes/${order.id}/adresse-livraison`);
			return;
		}
		editShippingDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			shippingFirstName: order.shippingFirstName,
			shippingLastName: order.shippingLastName,
			shippingAddress1: order.shippingAddress1,
			shippingAddress2: order.shippingAddress2,
			shippingPostalCode: order.shippingPostalCode,
			shippingCity: order.shippingCity,
			shippingCountry: order.shippingCountry,
			shippingPhone: order.shippingPhone,
		});
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="flex items-center gap-2 text-base">
					<MapPinIcon className="size-5" aria-hidden="true" />
					Livraison
				</CardTitle>
				<div className="flex items-center gap-1">
					<CopyButton text={shippingAddressText} label="Adresse de livraison" />
					{canEditShipping && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleEditShipping}
							className="min-h-11 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9"
							aria-label="Modifier l'adresse de livraison"
						>
							<PencilSimpleIcon className="size-4" aria-hidden="true" />
							Modifier
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<address className="text-sm leading-relaxed not-italic">
					<p className="font-medium">
						{order.shippingFirstName} {order.shippingLastName}
					</p>
					<p>{order.shippingAddress1}</p>
					{order.shippingAddress2 && <p>{order.shippingAddress2}</p>}
					<p>
						{order.shippingPostalCode} {order.shippingCity}
					</p>
					<p>{getCountryLabel(order.shippingCountry)}</p>
					{order.shippingPhone && (
						<p className="text-muted-foreground mt-2 flex items-center gap-1">
							<PhoneIcon className="size-3" aria-hidden="true" />
							{order.shippingPhone}
						</p>
					)}
				</address>
			</CardContent>
		</Card>
	);
}
