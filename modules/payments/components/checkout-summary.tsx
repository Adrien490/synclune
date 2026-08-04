"use client";

import { useId, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { ShippingRate } from "@/modules/orders/constants/shipping-rates";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { formatEuro } from "@/shared/utils/format-euro";
import { DEFAULT_FRANCHISE_VAT_MENTION } from "@/shared/constants/vat-franchise";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { getSkuMaterialsLabel } from "@/modules/skus/utils/sku-materials-label";
import { getSkuColorsLabel } from "@/modules/skus/utils/sku-colors-label";
import { ArrowSquareOutIcon, CaretDownIcon, InfoIcon, ShieldIcon } from "@phosphor-icons/react/ssr";
import { VisaIcon, MastercardIcon, CBIcon } from "@/shared/components/icons/payment-icons";
import Image from "next/image";
import Link from "next/link";
import { SHIPPING_UNAVAILABLE } from "../constants/shipping-unavailable";
import { ROUTES } from "@/shared/constants/urls";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

interface CheckoutSummaryProps {
	cart: NonNullable<GetCartReturn>;
	subtotal: number;
	shipping: number;
	shippingUnavailable: boolean;
	shippingInfo: ShippingRate | null;
	total: number;
}

/**
 * Composant résumé de la commande pour la page checkout
 * Affiche le récapitulatif des articles, frais de port et total
 * Mobile: collapsible summary. Desktop: sticky sidebar.
 */
interface SummaryContentProps {
	cart: NonNullable<GetCartReturn>;
	subtotal: number;
	shipping: number;
	shippingUnavailable: boolean;
	shippingInfo: ShippingRate | null;
	total: number;
	totalItems: number;
	onEditCart: () => void;
}

function SummaryContent({
	cart,
	subtotal,
	shipping,
	shippingUnavailable,
	shippingInfo,
	total,
	totalItems,
	onEditCart,
}: SummaryContentProps) {
	const tvaTooltipId = useId();
	return (
		<>
			{/* Liste des articles */}
			<div className="space-y-3">
				{cart.items.map((item) => (
					<div key={item.id} className="flex gap-3 text-sm">
						{/* Image */}
						<div
							className="bg-muted border-primary/10 relative size-16 shrink-0 overflow-hidden rounded-xl border"
							style={{ viewTransitionName: `checkout-item-${item.id}` }}
						>
							{item.sku.images[0] ? (
								<Image
									src={item.sku.images[0].url}
									alt={item.sku.images[0].altText ?? item.sku.product.title}
									fill
									sizes="64px"
									quality={IMAGE_QUALITY.THUMBNAIL}
									className="object-cover"
									placeholder={item.sku.images[0].blurDataUrl ? "blur" : "empty"}
									blurDataURL={item.sku.images[0].blurDataUrl ?? undefined}
								/>
							) : (
								<div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
									N/A
								</div>
							)}
						</div>

						{/* Détails */}
						<div className="min-w-0 flex-1">
							<p className="line-clamp-2 text-sm font-medium">{item.sku.product.title}</p>
							{item.sku.size && (
								<p className="text-muted-foreground text-xs">Taille: {item.sku.size}</p>
							)}
							{(() => {
								const colorsLabel = getSkuColorsLabel(item.sku.colors);
								return colorsLabel ? (
									<p className="text-muted-foreground text-xs">Couleur: {colorsLabel}</p>
								) : null;
							})()}
							{(() => {
								const label = getSkuMaterialsLabel(item.sku.materials);
								return label ? (
									<p className="text-muted-foreground text-xs">Matière: {label}</p>
								) : null;
							})()}
							<p className="text-muted-foreground mt-1 text-xs">Qté: {item.quantity}</p>
						</div>

						{/* Prix */}
						<div className="text-right">
							<p className="text-sm font-medium tabular-nums">
								{formatEuro(item.priceAtAdd * item.quantity)}
							</p>
							{item.quantity > 1 && (
								<p className="text-muted-foreground text-xs">
									{formatEuro(item.priceAtAdd)} × {item.quantity}
								</p>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Bouton modifier panier */}
			<div className="text-center">
				<button
					type="button"
					onClick={onEditCart}
					className="text-foreground focus-ring can-hover:hover:no-underline inline-flex items-center gap-1 rounded-sm text-xs underline"
				>
					Modifier mon panier
				</button>
			</div>

			<Separator />

			{/* Détails du panier */}
			<div className="space-y-3 text-sm/6 tracking-normal antialiased">
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground">
						Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
					</span>
					<span className="text-base/6 font-medium tabular-nums">{formatEuro(subtotal)}</span>
				</div>

				{/* Frais de port */}
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground">Livraison</span>
					<span className="text-base/6 font-medium tabular-nums">
						{shippingUnavailable ? (
							<span className="text-muted-foreground text-sm italic">
								{SHIPPING_UNAVAILABLE.summary}
							</span>
						) : (
							formatEuro(shipping)
						)}
					</span>
				</div>
				{shippingInfo && !shippingUnavailable && (
					<p className="text-muted-foreground pl-5.5 text-xs">
						Délai estimé : {shippingInfo.estimatedDays}
					</p>
				)}
			</div>

			<Separator />

			{/*
			 * Total — PAS de région live ici.
			 *
			 * Ce bloc n'est monté que quand le résumé mobile est DÉPLIÉ (il est replié
			 * par défaut), et l'instance desktop est en `display:none` sous `md` donc
			 * ignorée des lecteurs d'écran : l'`aria-live` posé ici n'annonçait donc rien
			 * sur mobile, y compris l'apparition des frais de port après saisie du code
			 * postal. Il était de surcroît monté AVEC son contenu (jamais vocalisé, cf.
			 * `live-region-premounted.regression.test.tsx`) et son `aria-label` était posé
			 * sur un `role=generic`, qui interdit le nommage par l'auteur.
			 * La région vit désormais dans `CheckoutSummary`, hors des deux branches.
			 * Audit UI/UX paiement 2026-07-26, F3.
			 */}
			<div className="bg-primary/5 -mx-1 space-y-2 rounded-xl p-3">
				<div className="flex items-center justify-between text-lg/7 font-semibold tracking-tight antialiased sm:text-xl/7">
					<span>Total</span>
					<span className="text-xl/7 tabular-nums sm:text-2xl/8">{formatEuro(total)}</span>
				</div>
				{/* Info micro-entreprise */}
				<TooltipProvider delay={200}>
					<Tooltip>
						<TooltipTrigger
							render={
								<button
									type="button"
									className="text-muted-foreground focus-ring ml-auto flex items-center gap-1 rounded-sm text-xs/5 tracking-normal antialiased"
									aria-label="Pourquoi pas de TVA ?"
									aria-describedby={tvaTooltipId}
								/>
							}
						>
							<span>{DEFAULT_FRANCHISE_VAT_MENTION}</span>
							<InfoIcon className="size-3" aria-hidden="true" />
						</TooltipTrigger>
						<TooltipContent id={tvaTooltipId} className="max-w-xs text-center">
							Synclune est en franchise en base de TVA (régime micro-entreprise). Aucune TVA
							n&apos;est facturée sur tes commandes.
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			{/* Badges de confiance (Baymard: icônes CB + message sécurité) */}
			<div className="border-primary/5 space-y-3 border-t pt-4">
				{/* Icônes cartes acceptées */}
				<div className="flex items-center justify-center gap-2">
					<VisaIcon className="text-muted-foreground h-5 w-auto" />
					<MastercardIcon className="text-muted-foreground h-5 w-auto" />
					<CBIcon className="text-muted-foreground h-5 w-auto" />
				</div>

				{/* Message sécurité */}
				<div className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
					<ShieldIcon className="text-success size-3.5" />
					<span>Paiement 100% sécurisé</span>
				</div>

				{/* Trust links */}
				<div className="text-muted-foreground flex items-center justify-center gap-3 text-xs">
					<Link
						href={ROUTES.LEGAL.WITHDRAWAL}
						className="inline-flex items-center gap-1 underline hover:no-underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						Politique de retour
						<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
						<span className="sr-only">(ouvre dans un nouvel onglet)</span>
					</Link>
					<span aria-hidden="true">·</span>
					<Link
						href={ROUTES.LEGAL.CGV}
						className="inline-flex items-center gap-1 underline hover:no-underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						CGV
						<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
						<span className="sr-only">(ouvre dans un nouvel onglet)</span>
					</Link>
				</div>
			</div>
		</>
	);
}

export function CheckoutSummary({
	cart,
	subtotal,
	shipping,
	shippingUnavailable,
	shippingInfo,
	total,
}: CheckoutSummaryProps) {
	const { open: openCart } = useSheet("cart");
	const haptic = useHaptic();
	// Une seule source pour le nom accessible de la <section> mobile : elle portait
	// À LA FOIS un `aria-label` et un `<h2 class="sr-only">` au libellé identique,
	// donc le lecteur d'écran annonçait la région puis le titre — deux fois le même
	// texte. `aria-labelledby` fait pointer la région sur son propre titre.
	const mobileHeadingId = useId();
	// Replié par défaut sur mobile (F6) : réduit le scroll jusqu'au formulaire.
	// Le header collapsed garde le mini-total visible (nb articles + montant).
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	/**
	 * Région live UNIQUE du total, montée ici — hors des branches mobile/desktop.
	 *
	 * Les deux cartes sont mutuellement exclusives par `display:none`, et le contenu
	 * mobile n'est même pas monté quand le résumé est replié (l'état par défaut).
	 * Une région vivant dans `SummaryContent` était donc muette sur mobile : le plus
	 * gros changement de total du tunnel — l'apparition des frais de port après
	 * saisie du code postal — n'était annoncé nulle part.
	 *
	 * Le message est calculé PENDANT LE RENDU, pas dans un `useEffect` : c'est le
	 * pattern React « ajuster un state quand une prop change ». React relance le
	 * rendu immédiatement, avant tout paint, donc la région naît vide (condition
	 * d'une annonce effective, cf. `live-region-premounted.regression.test.tsx`) puis
	 * se remplit sur le rendu suivant — sans passer par un effet.
	 *
	 * Limite connue : deux changements ramenant au même montant (100 → 90 → 100)
	 * sont bien réannoncés (la clé change à chaque fois), mais un lecteur d'écran
	 * peut avaler un message identique consécutif. Pas de compteur artificiel.
	 */
	const totalKey = `${total}|${shippingUnavailable}`;
	const [renderedTotalKey, setRenderedTotalKey] = useState(totalKey);
	const [totalAnnouncement, setTotalAnnouncement] = useState("");

	if (totalKey !== renderedTotalKey) {
		setRenderedTotalKey(totalKey);
		setTotalAnnouncement(
			shippingUnavailable
				? SHIPPING_UNAVAILABLE.summary
				: `Total mis à jour : ${formatEuro(total)}`,
		);
	}

	const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

	const handleEditCart = () => {
		haptic("light");
		openCart();
	};

	const contentProps: SummaryContentProps = {
		cart,
		subtotal,
		shipping,
		shippingUnavailable,
		shippingInfo,
		total,
		totalItems,
		onEditCart: handleEditCart,
	};

	return (
		<>
			{/* Pré-montée et VIDE au premier rendu, en dehors des deux cartes (leur
			    conteneur parent n'est jamais `display:none`). */}
			<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{totalAnnouncement}
			</span>

			{/* Mobile: collapsible summary (collapsed by default — F6 — pour réduire le scroll
			    jusqu'au formulaire ; le mini-total reste visible dans le header). */}
			<section className="lg:hidden" aria-labelledby={mobileHeadingId}>
				<h2 id={mobileHeadingId} className="sr-only">
					Récapitulatif de ta commande
				</h2>

				<Card className="border-primary/10 rounded-2xl shadow-md">
					<button
						type="button"
						onClick={() => {
							haptic("selection");
							setIsMobileOpen((prev) => !prev);
						}}
						aria-expanded={isMobileOpen}
						aria-controls="checkout-summary-mobile-content"
						className="w-full text-left"
					>
						<CardHeader className="pb-0">
							<div className="flex items-center justify-between">
								<CardTitle className="text-base">
									{totalItems} article{totalItems > 1 ? "s" : ""}
								</CardTitle>
								<div className="flex items-center gap-2">
									<span className="text-lg font-semibold tabular-nums">{formatEuro(total)}</span>
									<CaretDownIcon
										className={`text-muted-foreground size-4 transition-transform ${
											isMobileOpen ? "rotate-180" : ""
										}`}
									/>
								</div>
							</div>
						</CardHeader>
					</button>
					{isMobileOpen && (
						<CardContent id="checkout-summary-mobile-content" className="space-y-4 pt-4 pb-6">
							<SummaryContent {...contentProps} />
						</CardContent>
					)}
				</Card>
			</section>

			{/* Desktop: sticky sidebar */}
			<Card className="border-primary/10 hidden rounded-2xl shadow-md lg:sticky lg:top-8 lg:block">
				{/* Le titre VISIBLE est le heading — plus de `sr-only` doublon au libellé
				    différent du texte affiché. `CardTitle` rend un <div> : il ne peut pas
				    tenir ce rôle (même raison que `checkout-cancel-heading-hierarchy`). */}
				<CardHeader className="pb-4">
					<h2 className="font-display text-lg/7 font-normal tracking-wide antialiased">
						Ta commande
					</h2>
				</CardHeader>

				<CardContent className="space-y-4 pb-6">
					<SummaryContent {...contentProps} />
				</CardContent>
			</Card>
		</>
	);
}
