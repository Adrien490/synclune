import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/browser";
import { ArrowCounterClockwiseIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react/ssr";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import type { OrderAlertsProps } from "./types";

export function OrderAlerts({ status, paymentStatus }: OrderAlertsProps) {
	const isCancelled = status === OrderStatus.CANCELLED;
	const isPaymentFailed = paymentStatus === PaymentStatus.FAILED;
	const isReturned = status === OrderStatus.RETURNED;

	if (!isCancelled && !isPaymentFailed && !isReturned) {
		return null;
	}

	return (
		<div className="space-y-4">
			{isCancelled && (
				<Alert variant="destructive">
					<XCircleIcon className="size-4" />
					<AlertTitle>Commande annulée</AlertTitle>
					<AlertDescription>Cette commande a été annulée.</AlertDescription>
				</Alert>
			)}
			{isPaymentFailed && (
				<Alert variant="destructive">
					<WarningIcon className="size-4" />
					<AlertTitle>Paiement échoué</AlertTitle>
					<AlertDescription>
						Le paiement a échoué. Contactez le client pour résoudre le problème.
					</AlertDescription>
				</Alert>
			)}
			{isReturned && (
				<Alert>
					<ArrowCounterClockwiseIcon className="size-4" />
					<AlertTitle>Commande retournée</AlertTitle>
					<AlertDescription>
						Cette commande a été retournée. Créez un remboursement si nécessaire.
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
