import type { Metadata } from "next";
import Link from "next/link";
import { ClearCartOnMount } from "@/modules/payments/components/clear-cart-on-mount";
import { PendingConfirmation } from "@/modules/payments/components/pending-confirmation";
import { Button } from "@/shared/components/ui/button";
import { prisma } from "@/shared/lib/prisma";
import { ROUTES } from "@/shared/constants/urls";
import { formatEuro } from "@/shared/utils/format-euro";

export const metadata: Metadata = {
	title: "Confirmation de commande | Synclune",
	robots: { index: false, follow: false },
};

/**
 * Landing du `success_url` Stripe Checkout (lot 3).
 *
 * La page LIT, elle n'écrit jamais la commande : le webhook
 * `checkout.session.completed` est le seul écrivain de la transition
 * PENDING→PAID. Si le webhook n'est pas encore passé, on affiche « paiement en
 * cours de confirmation » et on re-vérifie automatiquement.
 *
 * Lecture volontairement SANS cache : c'est une page d'état transactionnel,
 * unique par session, dont la fraîcheur prime.
 */
export default async function CheckoutReturnPage({
	searchParams,
}: {
	searchParams: Promise<{ session_id?: string }>;
}) {
	const { session_id: sessionId } = await searchParams;

	const order = sessionId
		? await prisma.order.findUnique({
				where: { stripeSessionId: sessionId },
				select: {
					id: true,
					status: true,
					email: true,
					amountTotalCents: true,
					items: {
						select: { id: true, nameSnapshot: true, variantSnapshot: true, quantity: true },
					},
				},
			})
		: null;

	if (!order) {
		return (
			<main
				id="main-content"
				tabIndex={-1}
				className="bg-background flex min-h-dvh items-center justify-center px-4 py-12"
			>
				<div className="w-full max-w-md space-y-6 text-center">
					<h1 className="font-display text-3xl font-normal tracking-tight">Commande introuvable</h1>
					<p className="text-muted-foreground">
						Ce lien de confirmation ne correspond à aucune commande. Si tu viens de payer, vérifie
						l&apos;email de confirmation qui t&apos;a été envoyé.
					</p>
					<Button render={<Link href={ROUTES.SHOP.HOME} />} size="lg">
						Retour à la boutique
					</Button>
				</div>
			</main>
		);
	}

	const isPaid = order.status === "PAID" || order.status === "SHIPPED";
	const isPending = order.status === "PENDING";

	return (
		<main
			id="main-content"
			tabIndex={-1}
			className="bg-background flex min-h-dvh items-center justify-center px-4 py-12"
		>
			{/* Le paiement est parti chez Stripe : le panier local a fait son œuvre. */}
			<ClearCartOnMount />

			<div className="w-full max-w-md space-y-6 text-center">
				{isPaid && (
					<>
						<h1 className="font-display text-3xl font-normal tracking-tight">
							Merci pour ta commande !
						</h1>
						<p className="text-muted-foreground">
							Ton paiement de{" "}
							<span className="text-foreground font-semibold">
								{formatEuro(order.amountTotalCents)}
							</span>{" "}
							est confirmé. Un email de confirmation
							{order.email ? ` a été envoyé à ${order.email}` : " arrive"} avec le récapitulatif.
						</p>
						<ul className="text-muted-foreground space-y-1 text-sm">
							{order.items.map((item) => (
								<li key={item.id}>
									{item.nameSnapshot}
									{item.variantSnapshot ? ` (${item.variantSnapshot})` : ""} × {item.quantity}
								</li>
							))}
						</ul>
					</>
				)}

				{/* Le composant client porte le texte des DEUX états (polling actif /
				    épuisé) : le repli « vérifie tes emails » doit apparaître pile quand
				    le rafraîchissement automatique s'arrête. */}
				{isPending && <PendingConfirmation />}

				{!isPaid && !isPending && (
					<>
						<h1 className="font-display text-3xl font-normal tracking-tight">
							Cette session de paiement est close
						</h1>
						<p className="text-muted-foreground">
							Cette commande a été annulée ou remboursée. Si ce n&apos;est pas ce que tu attendais,
							réponds à l&apos;email de confirmation ou repasse commande.
						</p>
					</>
				)}

				<Button render={<Link href={ROUTES.SHOP.HOME} />} size="lg" variant="outline">
					Retour à la boutique
				</Button>
			</div>
		</main>
	);
}
