import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/browser";
import { AlertTriangle, RotateCcw, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import type { OrderAlertsProps } from "./types";

export function OrderAlerts({ status, paymentStatus, fulfillmentStatus }: OrderAlertsProps) {
	const isCancelled = status === OrderStatus.CANCELLED;
	const isPaymentFailed = paymentStatus === PaymentStatus.FAILED;
	const isReturned = fulfillmentStatus === FulfillmentStatus.RETURNED;

	if (!isCancelled && !isPaymentFailed && !isReturned) {
		return null;
	}

	return (
		<div className="space-y-4">
			{isCancelled && (
				<Alert variant="destructive">
					<XCircle className="h-4 w-4" />
					<AlertTitle>Commande annulée</AlertTitle>
					<AlertDescription>
						Cette commande a été annulée.
					</AlertDescription>
				</Alert>
			)}
			{isPaymentFailed && (
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Paiement échoué</AlertTitle>
					<AlertDescription>
						Le paiement a échoué. Contactez le client pour résoudre le problème.
					</AlertDescription>
				</Alert>
			)}
			{isReturned && (
				<Alert>
					<RotateCcw className="h-4 w-4" />
					<AlertTitle>Commande retournée</AlertTitle>
					<AlertDescription>
						Cette commande a été retournée. Créez un remboursement si nécessaire.
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
