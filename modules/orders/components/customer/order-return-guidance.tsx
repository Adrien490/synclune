import Link from "next/link";
import { InfoIcon } from "@phosphor-icons/react/ssr";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { BRAND } from "@/shared/constants/brand";
import { ROUTES } from "@/shared/constants/urls";
import {
	getReturnDaysRemaining,
	getReturnIneligibilityReason,
	WITHDRAWAL_PERIOD_DAYS,
} from "@/modules/refunds/services/return-eligibility.service";
import type { OrderStatus, PaymentStatus, RefundStatus } from "@/app/generated/prisma/enums";

interface OrderReturnGuidanceProps {
	order: {
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		actualDelivery: Date | null;
		refunds?: Array<{ status: RefundStatus }>;
	};
}

/**
 * AUDIT-BIZ-001 — explique au client où il en est de son droit de rétractation,
 * quel que soit l'état de la commande.
 *
 * Chaque état produit une explication ACTIONNABLE :
 * - payée non livrée : le délai démarre à la réception + sorties immédiates
 *   (contact, formulaire type L221-5 sur `/retractation`) ;
 * - éligible : la demande de retour se fait PAR EMAIL — le flow self-service
 *   (`RequestReturnButton` / `request-return.ts`) est parti avec l'espace client
 *   (2026-07-31), l'opératrice traite ensuite via `processRefund` ;
 * - délai écoulé : renvoi vers la garantie légale de conformité ;
 * - demande en cours : le dit, au lieu de laisser croire à une inaction.
 *
 * Rend `null` seulement quand parler de retour n'a pas de sens (commande
 * annulée / non payée).
 */
export function OrderReturnGuidance({ order }: OrderReturnGuidanceProps) {
	if (order.status === "CANCELLED") return null;

	const reason = getReturnIneligibilityReason({
		status: order.status,
		paymentStatus: order.paymentStatus,
		actualDelivery: order.actualDelivery,
		refunds: order.refunds ?? [],
	});

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

	if (reason === null) {
		// Éligible ≡ now < deadline, donc toujours ≥ 1 jour restant ici.
		const daysRemaining = getReturnDaysRemaining(order.actualDelivery);
		return (
			<Alert>
				<InfoIcon />
				<AlertTitle>Retour possible</AlertTitle>
				<AlertDescription className="space-y-2">
					<p>
						Tu as encore {daysRemaining} jour{daysRemaining > 1 ? "s" : ""} pour changer
						d&apos;avis. Écris-moi à {contactLink} avec ton numéro de commande et je t&apos;indique
						la marche à suivre pour le retour et le remboursement.
					</p>
					<p>Tu peux aussi utiliser le {withdrawalLink}.</p>
				</AlertDescription>
			</Alert>
		);
	}

	if (reason === "ALREADY_REQUESTED") {
		return (
			<Alert>
				<InfoIcon />
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
				<InfoIcon />
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
			<InfoIcon />
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
