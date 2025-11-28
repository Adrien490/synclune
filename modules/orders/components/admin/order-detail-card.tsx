"use client";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/browser";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
	FULFILLMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_VARIANTS,
} from "@/shared/constants/order";
import { getCarrierLabel, type Carrier } from "@/shared/utils/carrier-detection";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowLeft,
	Calendar,
	CheckCircle,
	Copy,
	CreditCard,
	ExternalLink,
	FileText,
	MapPin,
	Package,
	Phone,
	RotateCcw,
	Truck,
	User,
	XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { toast } from "sonner";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { CANCEL_ORDER_DIALOG_ID } from "./cancel-order-alert-dialog";
import { MARK_AS_PAID_DIALOG_ID } from "./mark-as-paid-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "./mark-as-shipped-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "./mark-as-delivered-alert-dialog";
import { UPDATE_TRACKING_DIALOG_ID } from "./update-tracking-dialog";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

// ============================================================================
// TYPES
// ============================================================================

interface OrderDetailCardProps {
	order: GetOrderReturn;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
	return (amount / 100).toFixed(2) + " €";
}

function copyToClipboard(text: string, label: string) {
	navigator.clipboard.writeText(text);
	toast.success(`${label} copié`);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderDetailCard({ order }: OrderDetailCardProps) {
	const cancelDialog = useAlertDialog(CANCEL_ORDER_DIALOG_ID);
	const markAsPaidDialog = useAlertDialog(MARK_AS_PAID_DIALOG_ID);
	const markAsShippedDialog = useAlertDialog(MARK_AS_SHIPPED_DIALOG_ID);
	const markAsDeliveredDialog = useAlertDialog(MARK_AS_DELIVERED_DIALOG_ID);
	const updateTrackingDialog = useAlertDialog(UPDATE_TRACKING_DIALOG_ID);

	// State machine conditions
	const isPending = order.status === OrderStatus.PENDING;
	const isProcessing = order.status === OrderStatus.PROCESSING;
	const isShipped = order.status === OrderStatus.SHIPPED;
	const isDelivered = order.status === OrderStatus.DELIVERED;
	const isCancelled = order.status === OrderStatus.CANCELLED;

	const isPaid = order.paymentStatus === PaymentStatus.PAID;
	const isUnpaid = order.paymentStatus === PaymentStatus.PENDING;

	const canMarkAsPaid = isPending && isUnpaid;
	const canCancel = !isCancelled && !isDelivered;
	const canMarkAsShipped = isProcessing && isPaid;
	const canMarkAsDelivered = isShipped;
	const canRefund = (isProcessing || isShipped || isDelivered) && isPaid;
	const canUpdateTracking = (isShipped || isDelivered) && order.trackingNumber;

	// Handlers
	const handleMarkAsPaid = () => {
		markAsPaidDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleMarkAsShipped = () => {
		markAsShippedDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleMarkAsDelivered = () => {
		markAsDeliveredDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleCancel = () => {
		cancelDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			isPaid: order.paymentStatus === PaymentStatus.PAID,
		});
	};

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

	// Format shipping address for copy
	const shippingAddressText = [
		`${order.shippingFirstName} ${order.shippingLastName}`,
		order.shippingAddress1,
		order.shippingAddress2,
		`${order.shippingPostalCode} ${order.shippingCity}`,
		order.shippingCountry,
	]
		.filter(Boolean)
		.join("\n");

	return (
		<div className="space-y-6">
			{/* Header avec retour */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/admin/ventes/commandes">
							<ArrowLeft className="h-4 w-4" />
							Retour
						</Link>
					</Button>
					<div>
						<ViewTransition name={`admin-order-${order.id}`}>
							<h1 className="text-2xl font-semibold tracking-tight">
								Commande {order.orderNumber}
							</h1>
						</ViewTransition>
						<p className="text-sm text-muted-foreground">
							Créée le{" "}
							{format(order.createdAt, "d MMMM yyyy 'à' HH'h'mm", {
								locale: fr,
							})}
						</p>
					</div>
				</div>

				{/* Actions */}
				<div className="flex flex-wrap items-center gap-2">
					{canMarkAsPaid && (
						<Button variant="outline" size="sm" onClick={handleMarkAsPaid}>
							<CreditCard className="h-4 w-4" />
							Marquer payée
						</Button>
					)}
					{canMarkAsShipped && (
						<Button variant="outline" size="sm" onClick={handleMarkAsShipped}>
							<Truck className="h-4 w-4" />
							Marquer expédiée
						</Button>
					)}
					{canMarkAsDelivered && (
						<Button variant="outline" size="sm" onClick={handleMarkAsDelivered}>
							<CheckCircle className="h-4 w-4" />
							Marquer livrée
						</Button>
					)}
					{canRefund && (
						<Button variant="outline" size="sm" asChild>
							<Link href={`/admin/ventes/remboursements/nouveau?orderId=${order.id}`}>
								<RotateCcw className="h-4 w-4" />
								Rembourser
							</Link>
						</Button>
					)}
					{canCancel && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleCancel}
							className="text-destructive hover:text-destructive"
						>
							<XCircle className="h-4 w-4" />
							Annuler
						</Button>
					)}
				</div>
			</div>

			{/* Status badges */}
			<div className="flex flex-wrap gap-2">
				<ViewTransition name={`admin-order-${order.id}-status`}>
					<Badge variant={ORDER_STATUS_VARIANTS[order.status]} className="text-sm">
						{ORDER_STATUS_LABELS[order.status]}
					</Badge>
				</ViewTransition>
				<ViewTransition name={`admin-order-${order.id}-payment`}>
					<Badge variant={PAYMENT_STATUS_VARIANTS[order.paymentStatus]} className="text-sm">
						{PAYMENT_STATUS_LABELS[order.paymentStatus]}
					</Badge>
				</ViewTransition>
				<ViewTransition name={`admin-order-${order.id}-fulfillment`}>
					<Badge variant={FULFILLMENT_STATUS_VARIANTS[order.fulfillmentStatus]} className="text-sm">
						{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
					</Badge>
				</ViewTransition>
			</div>

			{/* Main grid */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column - 2/3 */}
				<div className="lg:col-span-2 space-y-6">
					{/* Items */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Package className="h-5 w-5" />
								Articles ({order.items.length})
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{order.items.map((item) => {
									const variant = [item.skuColor, item.skuSize, item.skuMaterial]
										.filter(Boolean)
										.join(" / ");

									return (
										<div
											key={item.id}
											className="flex items-start gap-4 py-3 border-b last:border-0"
										>
											{/* Image */}
											<div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
												{item.skuImageUrl || item.productImageUrl ? (
													<Image
														src={item.skuImageUrl || item.productImageUrl || ""}
														alt={item.productTitle}
														fill
														className="object-cover"
													/>
												) : (
													<div className="flex h-full w-full items-center justify-center">
														<Package className="h-6 w-6 text-muted-foreground" />
													</div>
												)}
											</div>

											{/* Details */}
											<div className="flex-1 min-w-0">
												<p className="font-medium truncate">{item.productTitle}</p>
												{variant && (
													<p className="text-sm text-muted-foreground">{variant}</p>
												)}
												<p className="text-sm text-muted-foreground">
													Qté : {item.quantity}
												</p>
											</div>

											{/* Price */}
											<div className="text-right shrink-0">
												<p className="font-medium">
													{formatCurrency(item.price * item.quantity)}
												</p>
												{item.quantity > 1 && (
													<p className="text-sm text-muted-foreground">
														{formatCurrency(item.price)} / unité
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
									<span>{formatCurrency(order.subtotal)}</span>
								</div>
								{order.discountAmount > 0 && (
									<div className="flex justify-between text-sm text-emerald-600">
										<span>Réduction</span>
										<span>-{formatCurrency(order.discountAmount)}</span>
									</div>
								)}
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Livraison</span>
									<span>
										{order.shippingCost === 0
											? "Gratuite"
											: formatCurrency(order.shippingCost)}
									</span>
								</div>
								{order.taxAmount > 0 && (
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">TVA</span>
										<span>{formatCurrency(order.taxAmount)}</span>
									</div>
								)}
								<Separator />
								<div className="flex justify-between font-semibold text-lg">
									<span>Total</span>
									<span>{formatCurrency(order.total)}</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Shipping / Tracking */}
					{(order.trackingNumber || order.shippedAt) && (
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="flex items-center gap-2">
									<Truck className="h-5 w-5" />
									Expédition
								</CardTitle>
								{canUpdateTracking && (
									<Button
										variant="ghost"
										size="sm"
										onClick={handleUpdateTracking}
									>
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
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													copyToClipboard(order.trackingNumber!, "Numéro de suivi")
												}
											>
												<Copy className="h-4 w-4" />
											</Button>
											{order.trackingUrl && (
												<Button variant="outline" size="sm" asChild>
													<a
														href={order.trackingUrl}
														target="_blank"
														rel="noopener noreferrer"
													>
														<ExternalLink className="h-4 w-4" />
														Suivre
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
					)}
				</div>

				{/* Right column - 1/3 */}
				<div className="space-y-6">
					{/* Customer */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								Client
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<p className="font-medium">{order.customerName}</p>
								<p className="text-sm text-muted-foreground">
									{order.customerEmail}
								</p>
								{order.customerPhone && (
									<p className="text-sm text-muted-foreground flex items-center gap-1">
										<Phone className="h-3 w-3" />
										{order.customerPhone}
									</p>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Shipping Address */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="flex items-center gap-2 text-base">
								<MapPin className="h-5 w-5" />
								Adresse de livraison
							</CardTitle>
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									copyToClipboard(shippingAddressText, "Adresse")
								}
							>
								<Copy className="h-4 w-4" />
							</Button>
						</CardHeader>
						<CardContent>
							<address className="not-italic text-sm leading-relaxed">
								<p className="font-medium">
									{order.shippingFirstName} {order.shippingLastName}
								</p>
								<p>{order.shippingAddress1}</p>
								{order.shippingAddress2 && <p>{order.shippingAddress2}</p>}
								<p>
									{order.shippingPostalCode} {order.shippingCity}
								</p>
								<p>{order.shippingCountry}</p>
								{order.shippingPhone && (
									<p className="mt-2 flex items-center gap-1 text-muted-foreground">
										<Phone className="h-3 w-3" />
										{order.shippingPhone}
									</p>
								)}
							</address>
						</CardContent>
					</Card>

					{/* Payment */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CreditCard className="h-5 w-5" />
								Paiement
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{order.paymentMethod && (
								<div>
									<p className="text-sm text-muted-foreground">Méthode</p>
									<p className="capitalize">{order.paymentMethod}</p>
								</div>
							)}
							{order.paidAt && (
								<div>
									<p className="text-sm text-muted-foreground">Date de paiement</p>
									<p>
										{format(order.paidAt, "d MMMM yyyy 'à' HH'h'mm", {
											locale: fr,
										})}
									</p>
								</div>
							)}
							{order.stripePaymentIntentId && (
								<div>
									<p className="text-sm text-muted-foreground">
										Stripe Payment Intent
									</p>
									<div className="flex items-center gap-2">
										<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]">
											{order.stripePaymentIntentId}
										</code>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											onClick={() =>
												copyToClipboard(
													order.stripePaymentIntentId!,
													"Payment Intent"
												)
											}
										>
											<Copy className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0"
											asChild
										>
											<a
												href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												<ExternalLink className="h-3 w-3" />
											</a>
										</Button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Invoice */}
					{order.invoiceNumber && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Facture
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div>
									<p className="text-sm text-muted-foreground">
										Numéro de facture
									</p>
									<p className="font-mono">{order.invoiceNumber}</p>
								</div>
								{order.invoiceGeneratedAt && (
									<div>
										<p className="text-sm text-muted-foreground">Générée le</p>
										<p>
											{format(
												order.invoiceGeneratedAt,
												"d MMMM yyyy 'à' HH'h'mm",
												{ locale: fr }
											)}
										</p>
									</div>
								)}
								{order.stripeInvoiceId && (
									<Button variant="outline" size="sm" className="w-full" asChild>
										<a
											href={`https://dashboard.stripe.com/invoices/${order.stripeInvoiceId}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											<ExternalLink className="h-4 w-4" />
											Voir sur Stripe
										</a>
									</Button>
								)}
							</CardContent>
						</Card>
					)}

					{/* Dates */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Historique
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Créée</span>
								<span>
									{format(order.createdAt, "d MMM yyyy, HH:mm", { locale: fr })}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Mise à jour</span>
								<span>
									{format(order.updatedAt, "d MMM yyyy, HH:mm", { locale: fr })}
								</span>
							</div>
							{order.paidAt && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Payée</span>
									<span>
										{format(order.paidAt, "d MMM yyyy, HH:mm", { locale: fr })}
									</span>
								</div>
							)}
							{order.shippedAt && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Expédiée</span>
									<span>
										{format(order.shippedAt, "d MMM yyyy, HH:mm", { locale: fr })}
									</span>
								</div>
							)}
							{order.actualDelivery && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Livrée</span>
									<span>
										{format(order.actualDelivery, "d MMM yyyy, HH:mm", {
											locale: fr,
										})}
									</span>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
