"use client";

import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
	FULFILLMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_VARIANTS,
} from "@/shared/constants/order";
import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/browser";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { History, User, ArrowRight } from "lucide-react";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";

interface OrderStatusHistoryProps {
	statusHistory: GetOrderReturn["statusHistory"];
}

type StatusHistoryEntry = GetOrderReturn["statusHistory"][0];

function getStatusLabel(field: string, status: string): string {
	switch (field) {
		case "status":
			return ORDER_STATUS_LABELS[status as OrderStatus] || status;
		case "paymentStatus":
			return PAYMENT_STATUS_LABELS[status as PaymentStatus] || status;
		case "fulfillmentStatus":
			return FULFILLMENT_STATUS_LABELS[status as FulfillmentStatus] || status;
		default:
			return status;
	}
}

function getStatusVariant(
	field: string,
	status: string
): "default" | "success" | "warning" | "destructive" | "secondary" | "outline" {
	switch (field) {
		case "status":
			return ORDER_STATUS_VARIANTS[status as OrderStatus] || "default";
		case "paymentStatus":
			return PAYMENT_STATUS_VARIANTS[status as PaymentStatus] || "default";
		case "fulfillmentStatus":
			return FULFILLMENT_STATUS_VARIANTS[status as FulfillmentStatus] || "default";
		default:
			return "default";
	}
}

function getFieldLabel(field: string): string {
	switch (field) {
		case "status":
			return "Statut";
		case "paymentStatus":
			return "Paiement";
		case "fulfillmentStatus":
			return "Livraison";
		default:
			return field;
	}
}

function formatChangedBy(changedBy: string): string {
	if (changedBy === "system") {
		return "Système";
	}
	if (changedBy.startsWith("webhook:")) {
		const event = changedBy.replace("webhook:", "");
		return `Webhook (${event})`;
	}
	// C'est un userId - on affiche "Admin"
	return "Admin";
}

export function OrderStatusHistory({ statusHistory }: OrderStatusHistoryProps) {
	if (!statusHistory || statusHistory.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<History className="h-5 w-5" />
					Historique des changements
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{statusHistory.map((entry: StatusHistoryEntry) => (
						<div
							key={entry.id}
							className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
						>
							{/* Header avec date et utilisateur */}
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									{format(entry.createdAt, "d MMM yyyy 'à' HH:mm", {
										locale: fr,
									})}
								</span>
								{entry.changedBy && (
									<span className="flex items-center gap-1 text-muted-foreground">
										<User className="h-3 w-3" />
										{formatChangedBy(entry.changedBy)}
									</span>
								)}
							</div>

							{/* Changement de statut */}
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-sm font-medium text-muted-foreground">
									{getFieldLabel(entry.field)}:
								</span>
								{entry.previousStatus && (
									<>
										<Badge
											variant={getStatusVariant(entry.field, entry.previousStatus)}
											className="text-xs"
										>
											{getStatusLabel(entry.field, entry.previousStatus)}
										</Badge>
										<ArrowRight className="h-3 w-3 text-muted-foreground" />
									</>
								)}
								<Badge
									variant={getStatusVariant(entry.field, entry.newStatus)}
									className="text-xs"
								>
									{getStatusLabel(entry.field, entry.newStatus)}
								</Badge>
							</div>

							{/* Raison */}
							{entry.reason && (
								<p className="text-sm text-muted-foreground italic">
									{entry.reason}
								</p>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
