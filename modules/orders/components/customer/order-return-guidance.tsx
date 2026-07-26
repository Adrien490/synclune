import Link from "next/link";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { BRAND } from "@/shared/constants/brand";
import { ROUTES } from "@/shared/constants/urls";
import {
	getReturnIneligibilityReason,
	WITHDRAWAL_PERIOD_DAYS,
} from "@/modules/refunds/services/return-eligibility.service";
import type { FulfillmentStatus, PaymentStatus, RefundStatus } from "@/app/generated/prisma/enums";

interface OrderReturnGuidanceProps {
	order: {
		status: string;
		paymentStatus: PaymentStatus;
		fulfillmentStatus: FulfillmentStatus;
		actualDelivery: Date | null;
		refunds?: Array<{ status: RefundStatus }>;
	};
}

/**
 * AUDIT-BIZ-001 — explique au client pourquoi le retour self-service n'est pas
 * (encore) disponible, et quel chemin emprunter en attendant.
 *
 * Contexte du défaut corrigé : `RequestReturnButton` n'apparaît que si
 * `isReturnEligible` est vrai, ce qui exige `fulfillmentStatus === DELIVERED`
 * **et** `actualDelivery` — un champ écrit uniquement par l'action admin manuelle
 * `mark-as-delivered`. Entre l'encaissement et ce marquage, le client n'avait
 * AUCUNE affordance ni explication : ni annulation (réservée aux commandes
 * PENDING donc non payées), ni retour. Le droit de rétractation était bien
 * exerçable (formulaire type L221-5 sur `/retractation`) mais rien ne l'y
 * menait depuis la commande.
 *
 * `getReturnIneligibilityReason()` existait déjà et discriminait précisément le
 * motif, mais n'était consommé que côté serveur (`request-return.ts`) : l'UI
 * client jetait l'information en n'appelant que le booléen. On la branche ici.
 *
 * Rend `null` quand la commande est éligible (le caller affiche alors le vrai
 * bouton de demande de retour) ou quand parler de retour n'a pas de sens
 * (commande annulée / non payée).
 */
export function OrderReturnGuidance({ order }: OrderReturnGuidanceProps) {
	if (order.status === "CANCELLED") return null;

	const reason = getReturnIneligibilityReason({
		paymentStatus: order.paymentStatus,
		fulfillmentStatus: order.fulfillmentStatus,
		actualDelivery: order.actualDelivery,
		refunds: order.refunds ?? [],
	});

	// Éligible → le caller rend le bouton de demande de retour.
	if (reason === null) return null;

	// Non payée : le sujet n'est pas le retour mais le paiement, traité ailleurs.
	if (reason === "NOT_PAID") return null;

	const withdrawalLink = (
		<Link href={ROUTES.LEGAL.WITHDRAWAL} className="underline underline-offset-2">
			formulaire de rétractation
		</Link>
	);
	const contactLink = (
		<Link href={`mailto:${BRAND.contact.email}`} className="underline underline-offset-2">
			{BRAND.contact.email}
		</Link>
	);

	if (reason === "ALREADY_REQUESTED") {
		return (
			<Alert>
				<Info />
				<AlertTitle>Demande de retour en cours</AlertTitle>
				<AlertDescription>
					Ta demande est en cours de traitement. Je reviens vers toi par email dès qu&apos;elle est
					validée.
				</AlertDescription>
			</Alert>
		);
	}

	if (reason === "DEADLINE_EXCEEDED") {
		return (
			<Alert>
				<Info />
				<AlertTitle>Délai de rétractation écoulé</AlertTitle>
				<AlertDescription>
					Le délai de {WITHDRAWAL_PERIOD_DAYS} jours suivant la réception est passé. Si ton bijou
					présente un défaut, la garantie légale de conformité s&apos;applique toujours : écris-moi
					à {contactLink}.
				</AlertDescription>
			</Alert>
		);
	}

	// NOT_DELIVERED — le cas le plus fréquent, et celui qui n'avait aucune UI.
	return (
		<Alert>
			<Info />
			<AlertTitle>Changer d&apos;avis, annuler ou retourner</AlertTitle>
			<AlertDescription className="space-y-2">
				<p>
					Ton délai de rétractation de {WITHDRAWAL_PERIOD_DAYS} jours démarre à la réception du
					colis — la demande de retour s&apos;activera ici automatiquement.
				</p>
				<p>
					Ta commande n&apos;est pas encore partie de l&apos;atelier ? Écris-moi à {contactLink} et
					je l&apos;annule avec remboursement. Tu peux aussi utiliser dès maintenant le{" "}
					{withdrawalLink}.
				</p>
			</AlertDescription>
		</Alert>
	);
}
