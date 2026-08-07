import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import {
	CHECKOUT_CANCEL_REASONS,
	getCheckoutCancelMessage,
} from "@/modules/payments/constants/checkout-cancel-messages";
import { BRAND } from "@/shared/constants/brand";
import { InfoIcon, LightbulbIcon, ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

export const metadata: Metadata = {
	title: "Paiement annulé | Synclune",
	description: "Ton paiement a été annulé. Ton panier est toujours disponible.",
	robots: {
		index: false,
		follow: false,
	},
};

// Parse tolérant champ par champ (`.catch`) : un `reason` hors enum (URL
// modifiée, nouveau code Stripe) ne doit invalider que LUI — sans le `.catch`,
// l'échec du parse de l'objet entier faisait aussi disparaître la référence de
// commande (`order_id`/`order_number`) de l'affichage.
const cancelParamsSchema = z.object({
	order_id: z.string().optional().catch(undefined),
	order_number: z.string().optional().catch(undefined),
	reason: z.enum(CHECKOUT_CANCEL_REASONS).optional().catch(undefined),
});

interface CheckoutCancelPageProps {
	searchParams: Promise<{
		order_id?: string;
		order_number?: string;
		reason?: string;
	}>;
}

/**
 * Page d'annulation de paiement avec messages d'erreur spécifiques.
 *
 * Paramètres URL :
 * - order_id    : ID interne (cuid, fallback display)
 * - order_number: numéro lisible (préféré pour l'affichage)
 * - reason      : code Stripe normalisé (validé par CHECKOUT_CANCEL_REASONS)
 */
export default async function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
	const params = await searchParams;
	const parsed = cancelParamsSchema.safeParse(params);
	const orderId = parsed.success ? parsed.data.order_id : undefined;
	const orderNumber = parsed.success ? parsed.data.order_number : undefined;
	const reason = parsed.success ? parsed.data.reason : undefined;
	const displayReference = orderNumber ?? orderId;

	const errorInfo = getCheckoutCancelMessage(reason);
	const ErrorIcon = errorInfo.icon;

	return (
		<div className="relative min-h-dvh">
			<section className="py-8 sm:py-10">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					<Card className="border-primary/10 rounded-lg shadow-md md:rounded-lg">
						<CardHeader className="space-y-4 pb-6 text-center">
							<div className="bg-muted/80 mx-auto flex size-18 items-center justify-center rounded-full">
								<ErrorIcon className="text-muted-foreground size-10" aria-hidden="true" />
							</div>
							<h1 className="font-display text-2xl leading-none font-normal sm:text-3xl">
								{errorInfo.title}
							</h1>
							<CardDescription className="text-base">
								Ta commande n&apos;a pas été finalisée
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Message d'erreur spécifique */}
							<Alert variant={reason && reason !== "canceled" ? "destructive" : "default"}>
								<InfoIcon className="size-4" aria-hidden="true" />
								<AlertDescription>{errorInfo.description}</AlertDescription>
							</Alert>

							{/* Conseil contextuel (colocalisé dans CHECKOUT_CANCEL_MESSAGES.advice) */}
							{errorInfo.advice && (
								<aside
									aria-label="Conseil"
									className="text-muted-foreground flex items-start gap-2 text-sm"
								>
									{/* Icône Phosphor et non un emoji : un glyphe couleur rendu par
									    l'OS, à côté de deux icônes vectorielles monochromes réglées sur
									    le trait maison, changeait de forme d'une plateforme à l'autre —
									    et c'était l'élément le plus coloré d'un écran d'échec. */}
									<LightbulbIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
									<span>
										<strong className="text-foreground">Que faire ?</strong> {errorInfo.advice}
									</span>
								</aside>
							)}

							{/* Reassurance unique (panier sauvegardé + retry immédiat) */}
							<p className="text-muted-foreground text-center text-sm">
								Ton panier et tes informations ont été sauvegardés. Tu peux réessayer immédiatement.
							</p>

							{/* 3DS-03 : réassurance de débit, nuancée par motif.
							    - "payment_failed" peut résulter d'un remboursement automatique
							      (oversell / sous-facturation : carte débitée PUIS remboursée par
							      le webhook) → on ne peut pas affirmer « aucun débit ».
							    - "canceled" le mentionne déjà dans sa description (anti-doublon). */}
							{reason === "payment_failed" ? (
								<p className="text-muted-foreground text-center text-sm">
									Si un montant a été débité, il te sera intégralement remboursé sous quelques
									jours.
								</p>
							) : (
								reason !== "canceled" && (
									<p className="text-muted-foreground text-center text-sm">
										Aucun montant n&apos;a été débité de ta carte.
									</p>
								)
							)}

							{/* Actions */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								<Button render={<Link href="/paiement" />} size="lg" className="flex-1">
									<ShoppingBagIcon className="mr-2 size-4" aria-hidden="true" />
									Reprendre ma commande
								</Button>
								<Button
									render={<Link href={`mailto:${BRAND.contact.email}`} />}
									variant="outline"
									size="lg"
									className="flex-1"
								>
									M&apos;écrire
								</Button>
							</div>

							{/* Référence commande — légende discrète (utile pour le support) */}
							{displayReference && (
								<p className="text-muted-foreground text-center text-xs">
									Référence de commande :{" "}
									<span className="text-foreground font-medium tabular-nums">
										{orderNumber ? `#${orderNumber}` : displayReference}
									</span>
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
