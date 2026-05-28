import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/shared/components/ui/card";
import {
	CHECKOUT_CANCEL_REASONS,
	getCheckoutCancelMessage,
} from "@/modules/payments/constants/checkout-cancel-messages";
import { BRAND } from "@/shared/constants/brand";
import { Info, ShoppingBag } from "lucide-react";
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

const cancelParamsSchema = z.object({
	order_id: z.string().optional(),
	order_number: z.string().optional(),
	reason: z.enum(CHECKOUT_CANCEL_REASONS).optional(),
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
					<Card className="border-primary/10 rounded-2xl shadow-md">
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
								<Info className="size-4" />
								<AlertDescription>{errorInfo.description}</AlertDescription>
							</Alert>

							{/* Référence commande (orderNumber préféré) */}
							{displayReference && (
								<Alert>
									<Info className="size-4" />
									<AlertDescription>
										Référence de commande :{" "}
										<span className="tabular-nums">
											{orderNumber ? `#${orderNumber}` : displayReference}
										</span>
									</AlertDescription>
								</Alert>
							)}

							{/* Conseil contextuel (colocalisé dans CHECKOUT_CANCEL_MESSAGES.advice) */}
							{errorInfo.advice && (
								<aside
									aria-label="Conseil"
									className="text-muted-foreground flex items-start gap-2 text-sm"
								>
									<span className="mt-0.5" aria-hidden="true">
										💡
									</span>
									<span>
										<strong className="text-foreground">Que faire ?</strong> {errorInfo.advice}
									</span>
								</aside>
							)}

							{/* Reassurance unique (panier sauvegardé + retry immédiat) */}
							<p className="text-muted-foreground text-center text-sm">
								Ton panier et tes informations ont été sauvegardés. Tu peux réessayer immédiatement.
							</p>

							{/* Actions */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								<Button asChild size="lg" className="flex-1">
									<Link href="/paiement">
										<ShoppingBag className="mr-2 size-4" />
										Reprendre ma commande
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg" className="flex-1">
									<Link href={`mailto:${BRAND.contact.email}`}>M&apos;écrire</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
