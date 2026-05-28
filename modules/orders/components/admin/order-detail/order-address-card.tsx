"use client";

import { MapPin, Pencil, Phone, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { FulfillmentStatus, InvoiceStatus } from "@/app/generated/prisma/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { CopyButton } from "@/shared/components/copy-button";
import { COUNTRY_NAMES } from "@/shared/constants/countries";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { EDIT_BILLING_ADDRESS_DIALOG_ID } from "../edit-billing-address-dialog";
import { EDIT_SHIPPING_ADDRESS_DIALOG_ID } from "../edit-shipping-address-dialog";
import type { OrderAddressCardProps } from "./types";

function getCountryLabel(code: string): string {
	return (COUNTRY_NAMES as Record<string, string | undefined>)[code] ?? code;
}

export function OrderAddressCard({ order }: OrderAddressCardProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const router = useRouter();
	const editShippingDialog = useAlertDialog(EDIT_SHIPPING_ADDRESS_DIALOG_ID);
	const editBillingDialog = useAlertDialog(EDIT_BILLING_ADDRESS_DIALOG_ID);

	const canEditShipping =
		order.fulfillmentStatus !== FulfillmentStatus.SHIPPED &&
		order.fulfillmentStatus !== FulfillmentStatus.DELIVERED &&
		order.fulfillmentStatus !== FulfillmentStatus.RETURNED;

	const canEditBilling = order.invoiceStatus !== InvoiceStatus.GENERATED;

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
		});
	};

	const handleEditBilling = () => {
		haptic("light");
		if (isMobile) {
			router.push(`/admin/ventes/commandes/${order.id}/adresse-facturation`);
			return;
		}
		editBillingDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			billingSameAsShipping: order.billingSameAsShipping,
			billingFirstName: order.billingFirstName,
			billingLastName: order.billingLastName,
			billingAddress1: order.billingAddress1,
			billingAddress2: order.billingAddress2,
			billingPostalCode: order.billingPostalCode,
			billingCity: order.billingCity,
			billingCountry: order.billingCountry,
			billingPhone: order.billingPhone,
		});
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="flex items-center gap-2 text-base">
					<MapPin className="size-5" aria-hidden="true" />
					Adresses
				</CardTitle>
				<CopyButton text={shippingAddressText} label="Adresse de livraison" />
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Livraison */}
				<section aria-labelledby="shipping-address-heading">
					<div className="mb-2 flex items-center justify-between gap-2">
						<h3
							id="shipping-address-heading"
							className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
						>
							Livraison
						</h3>
						{canEditShipping && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleEditShipping}
								className="min-h-11 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9"
								aria-label="Modifier l'adresse de livraison"
							>
								<Pencil className="size-4" aria-hidden="true" />
								Modifier
							</Button>
						)}
					</div>
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
								<Phone className="size-3" aria-hidden="true" />
								{order.shippingPhone}
							</p>
						)}
					</address>
				</section>

				{/* Facturation */}
				<section aria-labelledby="billing-address-heading" className="border-t pt-4">
					<div className="mb-2 flex items-center justify-between gap-2">
						<h3
							id="billing-address-heading"
							className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase"
						>
							<ReceiptText className="size-3.5" aria-hidden="true" />
							Facturation
						</h3>
						{canEditBilling && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleEditBilling}
								className="min-h-11 touch-manipulation motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.98] sm:min-h-9"
								aria-label="Modifier l'adresse de facturation"
							>
								<Pencil className="size-4" aria-hidden="true" />
								Modifier
							</Button>
						)}
					</div>
					{order.billingSameAsShipping ? (
						<p className="text-muted-foreground text-sm italic">
							Identique à l'adresse de livraison
						</p>
					) : (
						<address className="text-sm leading-relaxed not-italic">
							<p className="font-medium">
								{order.billingFirstName} {order.billingLastName}
							</p>
							{order.billingAddress1 && <p>{order.billingAddress1}</p>}
							{order.billingAddress2 && <p>{order.billingAddress2}</p>}
							{(order.billingPostalCode ?? order.billingCity) && (
								<p>
									{order.billingPostalCode} {order.billingCity}
								</p>
							)}
							{order.billingCountry && <p>{getCountryLabel(order.billingCountry)}</p>}
							{order.billingPhone && (
								<p className="text-muted-foreground mt-2 flex items-center gap-1">
									<Phone className="size-3" aria-hidden="true" />
									{order.billingPhone}
								</p>
							)}
						</address>
					)}
				</section>
			</CardContent>
		</Card>
	);
}
