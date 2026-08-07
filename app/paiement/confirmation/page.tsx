import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Fade } from "@/shared/components/animations/fade";
import { HandDrawnUnderline } from "@/shared/components/animations/hand-drawn-accent";
import { PurchaseTracker } from "@/shared/components/analytics/purchase-tracker";
import { CartCleaner } from "./_components/cart-cleaner";
import { PendingPaymentWatcher } from "./_components/pending-payment-watcher";
import { ReceiptButton } from "./_components/receipt-button";
import { SuccessIcon } from "./_components/success-icon";
import { getOrderForConfirmation } from "@/modules/orders/data/get-order-for-confirmation";
import { getShippingInfo } from "@/modules/orders/services/shipping.service";
import { formatCountryName, type ShippingCountry } from "@/shared/constants/countries";
import { BRAND } from "@/shared/constants/brand";
import { IMAGE_BLUR_FALLBACK } from "@/shared/constants/images";
import { ROUTES } from "@/shared/constants/urls";
import { formatEuro } from "@/shared/utils/format-euro";
import { formatDateLong } from "@/shared/utils/dates";
import {
	ClockIcon,
	HeartIcon,
	PackageIcon,
	SparkleIcon,
	TruckIcon,
} from "@phosphor-icons/react/ssr";
import { buildOrderTrackingUrl } from "@/modules/orders/utils/build-order-tracking-url";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

export const metadata: Metadata = {
	title: "Commande confirmée | Synclune",
	description: "Ta commande a été confirmée avec succès. Merci pour ta confiance !",
	robots: {
		index: false,
		follow: false,
	},
};

interface CheckoutSuccessPageProps {
	searchParams: Promise<{
		order_id?: string;
		order_number?: string;
		pending?: string;
	}>;
}

type NextStep = {
	title: string;
	description: (customerEmail: string | null) => React.ReactNode;
};

const NEXT_STEPS: readonly NextStep[] = [
	{
		title: "Email de confirmation",
		description: (email) =>
			email ? (
				<>
					Récapitulatif envoyé à{" "}
					<span className="text-foreground font-medium break-all">{email}</span> dans les prochaines
					minutes. Pense à vérifier tes spams.
				</>
			) : (
				"Tu vas recevoir un email récapitulatif dans les prochaines minutes. Pense à vérifier tes spams si tu ne le reçois pas."
			),
	},
	{
		title: "Je prépare ta commande",
		description: () =>
			"Ton bijou sera préparé avec soin et expédié dans les prochains jours ouvrés.",
	},
	{
		title: "Suivi de livraison",
		description: () =>
			"Tu recevras un email avec le numéro de suivi dès que ton colis sera expédié.",
	},
];

/**
 * Page de confirmation de commande réussie.
 *
 * SÉCURISÉ : double vérification order_id + order_number.
 * Accepte paymentStatus PENDING car le webhook peut ne pas avoir encore traité.
 */
export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
	const params = await searchParams;
	const orderId = params.order_id;
	const orderNumber = params.order_number;
	const isPending = params.pending === "true";

	if (!orderId || !orderNumber) {
		redirect("/");
	}

	const order = await getOrderForConfirmation(orderId, orderNumber);

	if (!order) {
		redirect("/");
	}

	// CHECKOUT-AUDIT-004 — si le paiement a déjà basculé FAILED côté webhook
	// (race d'over-sell du dernier exemplaire, refus async), on redirige vers
	// la page d'annulation pour éviter d'afficher "Commande confirmée" sur une
	// commande qui sera remboursée automatiquement.
	if (order.paymentStatus === "FAILED") {
		redirect(
			`/paiement/annulation?order_id=${encodeURIComponent(orderId)}&order_number=${encodeURIComponent(orderNumber)}&reason=payment_failed`,
		);
	}

	// `isWebhookPending` = le webhook Stripe n'a pas encore acquitté le PaymentIntent.
	// On garde l'utilisateur dans un état "vérification en cours" jusqu'au bascule
	// `PAID`, pour éviter le scénario double-vente où "Commande confirmée"
	// s'affiche avant le refund automatique (cf [[CHECKOUT-AUDIT-004]]).
	const isWebhookPending = order.paymentStatus === "PENDING";
	const showPendingState = isPending || isWebhookPending;

	const shippingInfo = getShippingInfo(
		((order.shippingCountry as ShippingCountry | null) ?? "FR") as ShippingCountry,
		order.shippingPostalCode,
	);

	return (
		<div className="relative min-h-dvh">
			{/*
			 * Vidage du panier : le cookie `cart` ne peut être supprimé ni ici (un
			 * Server Component n'écrit pas de cookie) ni par le webhook Stripe (appel
			 * serveur-à-serveur, sans cookie client). Cf. `clearCartAfterOrder`.
			 */}
			<CartCleaner />
			<section className="py-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:py-10 sm:pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
				<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
					{/* Message de succès principal */}
					<Card className="border-primary/20 from-primary/5 to-background rounded-lg border-2 bg-linear-to-br shadow-md md:rounded-lg">
						<CardHeader className="space-y-4 pb-6 text-center">
							<SuccessIcon />
							<Fade y={10} delay={0.1}>
								{/* Le trait dessiné à la main remplace l'emoji ✨ : c'est le
								    vocabulaire de la boutique (`HandDrawnUnderline`), pas un glyphe
								    système qui change de forme selon l'OS. Il ne survivait nulle
								    part ailleurs dans le tunnel — 80px de trait sous le h1 de
								    /paiement, puis plus rien pendant quatre écrans. */}
								<h1 className="font-display text-2xl leading-none font-normal sm:text-3xl">
									Merci pour ta confiance !
								</h1>
								<div className="mt-2 flex justify-center">
									<HandDrawnUnderline width={96} strokeWidth={1.5} inView={false} />
								</div>
							</Fade>
							<Fade y={10} delay={0.15}>
								<div className="space-y-2">
									<p className="text-muted-foreground text-sm">
										{showPendingState
											? "Ta commande a été enregistrée"
											: "Ton paiement a été accepté avec succès"}
									</p>
									<p className="text-lg font-semibold">Commande #{order.orderNumber}</p>
									<p className="text-muted-foreground text-xs">
										Commandée le {formatDateLong(order.createdAt)}
									</p>
									{order.stripePaymentIntentId && !showPendingState && (
										<Suspense fallback={null}>
											<ReceiptButton stripePaymentIntentId={order.stripePaymentIntentId} />
										</Suspense>
									)}
								</div>
							</Fade>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Pending payment state : webhook pas encore acquitté, ou carte 3DS en
							    cours de settlement (card-only — pas de SEPA/Klarna). */}
							{showPendingState && (
								<Alert>
									<ClockIcon aria-hidden="true" />
									<AlertTitle>Paiement en cours de vérification</AlertTitle>
									<AlertDescription>
										Ton paiement est en cours de vérification. Tu recevras un email de confirmation
										dès qu&apos;il sera validé.
										<PendingPaymentWatcher orderId={order.id} orderNumber={order.orderNumber} />
									</AlertDescription>
								</Alert>
							)}

							{/*
							 * Articles commandés — premier groupe, donc pas de filet : il suit
							 * directement le header de la carte.
							 *
							 * Les trois blocs de ce bloc-ci portaient tous
							 * `bg-muted/50 border-primary/5 rounded-xl border p-4`, empilés DANS
							 * une Card : trois boîtes grises identiques dans une boîte, sans
							 * hiérarchie, sur l'écran de la joie. Ils sont désormais séparés par
							 * un filet tireté — même regroupement, une épaisseur de moins.
							 */}
							{order.items.length > 0 && (
								<section aria-labelledby="confirmation-items-heading" className="space-y-3">
									<h2 id="confirmation-items-heading" className="text-base font-semibold">
										Articles commandés
									</h2>
									{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
									<ul role="list" className="space-y-3">
										{order.items.map((item) => (
											<li key={item.id} className="flex gap-3 text-sm">
												<div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-xl border">
													{item.productImageUrl ? (
														<Image
															src={item.productImageUrl}
															alt={item.productTitle}
															fill
															sizes="56px"
															quality={IMAGE_QUALITY.THUMBNAIL}
															className="object-cover"
															placeholder="blur"
															blurDataURL={IMAGE_BLUR_FALLBACK}
														/>
													) : (
														<div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
															N/A
														</div>
													)}
												</div>
												<div className="min-w-0 flex-1">
													<p className="line-clamp-1 font-medium">{item.productTitle}</p>
													<div className="text-muted-foreground space-x-2 text-xs">
														{item.skuSize && <span>Taille: {item.skuSize}</span>}
														{item.skuColor && <span>Couleur: {item.skuColor}</span>}
														{item.skuMaterial && <span>Matière: {item.skuMaterial}</span>}
													</div>
													<p className="text-muted-foreground text-xs">Qté: {item.quantity}</p>
												</div>
												<div className="shrink-0 text-right">
													<p className="font-medium tabular-nums">
														{formatEuro(item.price * item.quantity)}
													</p>
													{item.quantity > 1 && (
														<p className="text-muted-foreground text-xs tabular-nums">
															{formatEuro(item.price)} × {item.quantity}
														</p>
													)}
												</div>
											</li>
										))}
									</ul>
								</section>
							)}

							{/* Récapitulatif montants */}
							<section
								aria-labelledby="confirmation-summary-heading"
								className="border-border space-y-3 border-t border-dashed pt-5"
							>
								<h2 id="confirmation-summary-heading" className="text-base font-semibold">
									Récapitulatif
								</h2>
								<dl className="space-y-2 text-sm">
									<div className="flex justify-between">
										<dt className="text-muted-foreground">Sous-total</dt>
										<dd className="tabular-nums">{formatEuro(order.subtotal)}</dd>
									</div>
									<div className="space-y-1">
										<div className="flex justify-between">
											<dt className="text-muted-foreground">Livraison</dt>
											<dd className="tabular-nums">{formatEuro(order.shippingCost)}</dd>
										</div>
										{shippingInfo && (
											<p className="text-muted-foreground flex items-center gap-1 pl-0.5 text-xs">
												<TruckIcon className="size-3" aria-hidden="true" />
												Délai estimé : {shippingInfo.estimatedDays}
											</p>
										)}
									</div>
									<div className="flex justify-between border-t pt-2 text-base font-semibold">
										<dt>Total</dt>
										<dd className="tabular-nums">{formatEuro(order.total)}</dd>
									</div>
								</dl>
							</section>

							{/* Adresse de livraison */}
							<section
								aria-labelledby="confirmation-address-heading"
								className="border-border space-y-2 border-t border-dashed pt-5"
							>
								<h2 id="confirmation-address-heading" className="text-base font-semibold">
									Adresse de livraison
								</h2>
								<div className="text-muted-foreground text-sm">
									<p className="text-foreground font-medium">
										{order.shippingFirstName} {order.shippingLastName}
									</p>
									<p>{order.shippingAddress1}</p>
									{order.shippingAddress2 && <p>{order.shippingAddress2}</p>}
									<p>
										{order.shippingPostalCode} {order.shippingCity}
									</p>
									<p>{formatCountryName(order.shippingCountry)}</p>
								</div>
							</section>

							{/* Message personnalisé */}
							<Alert>
								<HeartIcon aria-hidden="true" />
								{/* Plus d'emoji : l'Alert porte déjà `HeartIcon`, la même icône,
								    en vectoriel et à la bonne graisse. */}
								<AlertTitle>Merci du fond du cœur</AlertTitle>
								<AlertDescription>
									Je vais préparer ta commande avec le plus grand soin ! Chaque bijou est emballé
									avec amour dans mon atelier.
								</AlertDescription>
							</Alert>

							{/* Prochaines étapes */}
							<section aria-labelledby="next-steps-heading" className="space-y-4">
								<h2
									id="next-steps-heading"
									className="font-display flex items-center gap-2 text-base font-normal"
								>
									<SparkleIcon className="text-primary size-5" aria-hidden="true" />
									Que va-t-il se passer maintenant ?
								</h2>

								<Fade y={15} delay={0.2}>
									<ol className="space-y-3">
										{NEXT_STEPS.map((step, idx) => (
											<li key={step.title} className="flex items-start gap-3">
												<div
													aria-hidden="true"
													className="bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full"
												>
													<span className="text-primary text-sm font-semibold">{idx + 1}</span>
												</div>
												<div>
													<p className="font-medium">{step.title}</p>
													<p className="text-muted-foreground text-sm">
														{step.description(order.customerEmail)}
													</p>
												</div>
											</li>
										))}
									</ol>
								</Fade>
							</section>

							{/*
							 * Actions — un seul chemin de suivi depuis le retrait de l'espace
							 * client (2026-07-31). Le bouton était gaté sur `session` : « Suivre
							 * ma commande » vers `/commandes/<n°>` pour un client connecté,
							 * « Retour à l'accueil » pour un invité. Toute commande étant
							 * désormais un achat invité, le lien tokenisé `/suivi-commande` est
							 * la seule destination — et c'est exactement celui de l'email de
							 * confirmation, donc les deux surfaces restent cohérentes.
							 */}
							<div className="flex flex-col gap-3 pt-4 sm:flex-row">
								<Button
									render={<Link href={buildOrderTrackingUrl(order)} />}
									size="lg"
									className="flex-1"
								>
									<PackageIcon className="mr-2 size-4" aria-hidden="true" />
									Suivre ma commande
								</Button>
								<Button
									render={<Link href={ROUTES.SHOP.PRODUCTS} />}
									variant="outline"
									size="lg"
									className="flex-1"
								>
									Continuer mes achats
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Message de support */}
					<div className="mt-8 space-y-2 text-center">
						<p className="text-muted-foreground text-sm">Une question sur ta commande ?</p>
						<Button render={<Link href={`mailto:${BRAND.contact.email}`} />} variant="link">
							Écris-moi
						</Button>
					</div>
				</div>
			</section>
			{!showPendingState && (
				<PurchaseTracker orderNumber={order.orderNumber} valueCents={order.total} currency="EUR" />
			)}
		</div>
	);
}
