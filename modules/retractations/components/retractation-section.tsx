import Link from "next/link";
import type { RetractationStatus } from "@/app/generated/prisma/client";
import {
	getRetractationDaysRemaining,
	getRetractationIneligibilityReason,
} from "@/modules/orders/services/retractation-eligibility.service";
import type { OrderForTracking } from "@/modules/orders/data/get-order-for-tracking";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { RetractationRequestForm } from "./retractation-request-form";

const CLIENT_STATUS_MESSAGES: Record<RetractationStatus, string> = {
	RECEIVED: "Ta demande de rétractation est enregistrée — l'accusé de réception arrive par email.",
	ACKNOWLEDGED:
		"Ta demande de rétractation est enregistrée. Renvoie ta commande à l'adresse indiquée dans les CGV — le remboursement suit la réception du retour.",
	AWAITING_RETURN: "Ton retour est bien arrivé à l'atelier — le remboursement est en préparation.",
	REFUNDED: "Ta commande a été remboursée sur ton moyen de paiement d'origine.",
	REJECTED:
		"Ta demande de rétractation n'a pas pu être acceptée — le détail t'a été envoyé par email.",
};

interface RetractationSectionProps {
	order: OrderForTracking;
	token: string;
}

/**
 * Section rétractation de la page de suivi — LE point d'entrée en ligne du
 * droit de rétractation (obligation depuis le 19 juin 2026). Pas de nouveau
 * chemin d'accès : le token de suivi est la clé.
 */
export function RetractationSection({ order, token }: RetractationSectionProps) {
	// Une demande existe (quel que soit son état) : on montre où elle en est.
	if (order.retractation) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Ta rétractation</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<p className="text-muted-foreground">
						{CLIENT_STATUS_MESSAGES[order.retractation.status]}
					</p>
					{order.retractation.status === "REFUNDED" &&
						order.retractation.creditNoteNumber != null && (
							<Button
								render={
									<Link
										href={`/suivi-commande/avoir?commande=${order.id}&token=${token}`}
										target="_blank"
									/>
								}
								variant="outline"
								size="sm"
							>
								Voir mon avoir (n° {order.retractation.creditNoteNumber})
							</Button>
						)}
				</CardContent>
			</Card>
		);
	}

	const reason = getRetractationIneligibilityReason(order);

	// Jamais encaissée / déjà remboursée : pas de droit à exercer ici.
	if (reason === "NOT_PAID") return null;

	if (reason === "NOT_SHIPPED") {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Changer d&apos;avis ?</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						Ta commande n&apos;est pas encore expédiée — pour l&apos;annuler avant l&apos;envoi,
						réponds simplement à ton email de confirmation.
					</p>
				</CardContent>
			</Card>
		);
	}

	// Éligible, ou hors délai (le formulaire reste soumettable : c'est un
	// droit de demande — l'admin tranchera).
	return (
		<Card>
			<CardHeader>
				<CardTitle>Droit de rétractation</CardTitle>
			</CardHeader>
			<CardContent>
				<RetractationRequestForm
					orderId={order.id}
					token={token}
					isPastDeadline={reason === "DEADLINE_EXCEEDED"}
					daysRemaining={getRetractationDaysRemaining(order.shippedAt)}
				/>
			</CardContent>
		</Card>
	);
}
