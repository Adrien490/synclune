"use client";

import { useDeferredValue, useOptimistic, useRef, useTransition } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import ScrollFade from "@/shared/components/scroll-fade";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBagIcon, XIcon } from "@phosphor-icons/react/ssr";
import {
	Empty,
	EmptyActions,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import Link from "next/link";
import { useSheet } from "@/shared/providers/sheet-store-provider";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { CartSheetItemRow } from "./cart-sheet-item-row";
import { RemoveCartItemAlertDialog } from "./remove-cart-item-alert-dialog";
import { CartPriceChangeAlert } from "./cart-price-change-alert";
import { CartSheetFooter } from "./cart-sheet-footer";
import { CartClearButton } from "./cart-clear-button";
import { ClearCartAlertDialog } from "./clear-cart-alert-dialog";
import type { CartItem, GetCartReturn } from "../types/cart.types";
import {
	hasCartItemIssue,
	getCartItemSubtotal,
	getCartItemIssueLabel,
} from "../services/cart-item.service";
import { CartOptimisticContext } from "../contexts/cart-optimistic-context";
import { CartCloseContext } from "../contexts/cart-close-context";
import { cartReducer } from "../services/cart-reducer.service";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { CART_TARGET_ATTR } from "../lib/fly-to-cart";

interface CartSheetProps {
	cart: GetCartReturn;
	recommendations?: React.ReactNode;
}

interface CartSheetHeaderContentProps {
	hasItems: boolean;
	totalItems: number;
	isPending: boolean;
	/** `SheetTitle` ou `DrawerTitle` — mêmes primitives Base UI, racines différentes. */
	Title: typeof SheetTitle;
	Description: typeof SheetDescription;
	Close: typeof SheetClose;
}

/**
 * Contenu de l'en-tête, partagé par les deux branches.
 *
 * ⚠️ **Le bouton de fermeture est rendu ICI, pas par la primitive.**
 * `SheetContent` en pose un par défaut (`showCloseButton`), mais ancré au
 * POPUP (`top-[max(1rem,env(safe-area-inset-top))]`) tandis que le bouton
 * « Vider » était centré sur l'EN-TÊTE : deux boutons voisins de même taille
 * dont les centres étaient à 38 px et 30 px du haut. Et `DrawerContent`, lui,
 * n'en rend AUCUN — sur mobile le panneau plein écran recouvrait la totalité
 * du scrim et `handleOnly` excluait le contenu du geste, ne laissant qu'une
 * poignée de 8 px comme unique sortie.
 *
 * Les deux boutons vivent donc dans la même rangée flex : un seul mécanisme
 * d'alignement, et une sortie visible sur les deux formats.
 */
function CartSheetHeaderContent({
	hasItems,
	totalItems,
	isPending,
	Title,
	Description,
	Close,
}: CartSheetHeaderContentProps) {
	return (
		<div className="flex items-center justify-between gap-2">
			<div className="min-w-0">
				<Title
					aria-label={
						hasItems ? `Mon panier, ${totalItems} article${totalItems > 1 ? "s" : ""}` : undefined
					}
				>
					Mon panier
					{hasItems && (
						<span
							aria-hidden="true"
							className="text-muted-foreground transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50"
						>
							{" "}
							({totalItems})
						</span>
					)}
				</Title>
				<Description className="sr-only">Gère les articles de ton panier</Description>
			</div>
			<div className="flex shrink-0 items-center gap-1">
				{hasItems && <CartClearButton disabled={isPending} />}
				<Close
					aria-label="Fermer le panier"
					className="focus-ring text-muted-foreground can-hover:hover:text-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors"
				>
					<XIcon className="size-5" aria-hidden="true" />
				</Close>
			</div>
		</div>
	);
}

interface CartSheetBodyProps {
	items: CartItem[];
	hasItems: boolean;
	totalItems: number;
	subtotal: number;
	hasStockIssues: boolean;
	itemsWithIssues: CartItem[];
	isPending: boolean;
	isMobile: boolean;
	close: () => void;
	recommendations?: React.ReactNode;
	shouldReduceMotion: boolean | null;
}

function CartSheetBody({
	items,
	hasItems,
	hasStockIssues,
	itemsWithIssues,
	isPending,
	isMobile,
	close,
	recommendations,
	shouldReduceMotion,
	totalItems,
	subtotal,
}: CartSheetBodyProps) {
	// Defer SR announcements so rapid +/- taps don't spam VoiceOver
	const announceItems = useDeferredValue(totalItems);
	const announceSubtotal = useDeferredValue(subtotal);

	return (
		<>
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{hasItems
					? `${announceItems} article${announceItems > 1 ? "s" : ""} dans le panier, sous-total ${formatEuro(announceSubtotal)}`
					: "Panier vide"}
			</div>

			{!hasItems ? (
				/* Pas de `role="status"` ici : la région live ci-dessus annonce déjà
			   « Panier vide », et deux régions sur la même information produisent une
			   double vocalisation au montage. C'est exactement ce que documente le
			   JSDoc d'`Empty` (`shared/components/ui/empty.tsx`), qui a retiré ces
			   attributs de la primitive pour cette raison. */
				<div className="flex min-h-0 flex-1 flex-col px-6 py-8">
					<Empty variant="borderless" className="flex-1">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<ShoppingBagIcon className="size-6" />
							</EmptyMedia>
							<EmptyTitle>Ton panier est encore vide</EmptyTitle>
						</EmptyHeader>
						<EmptyDescription>
							Chaque pièce est faite à la main, en un seul exemplaire. Trouve celle qui te
							ressemble.
						</EmptyDescription>
						<EmptyActions>
							<Button
								render={<Link href="/produits" onClick={close} />}
								size="lg"
								className="group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
							>
								Découvrir la boutique
							</Button>
							<Button
								render={<Link href="/collections" onClick={close} />}
								variant="link"
								className="text-muted-foreground group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
							>
								Voir les collections
							</Button>
						</EmptyActions>
					</Empty>
				</div>
			) : (
				<>
					{hasStockIssues && (
						/* Texte en `--foreground` : `text-destructive` sur `bg-destructive/10`
						   valait 3,81:1 et sa liste `text-destructive/80` en 12 px 2,93:1 —
						   les deux sous AA. La barre pleine à gauche porte la sévérité. */
						<div
							id="stock-issues-alert"
							className="bg-destructive/10 border-l-destructive text-foreground shrink-0 border-b border-l-4 px-6 py-2.5"
							role="alert"
							aria-label="Problèmes de stock dans le panier"
						>
							<p className="text-sm font-semibold">Ajuste ton panier pour continuer</p>
							<ul className="mt-1 space-y-0.5 text-xs">
								{itemsWithIssues.map((item) => (
									<li key={item.id} className="flex items-center gap-1">
										<span aria-hidden="true">•</span>
										<span className="line-clamp-1">
											{item.sku.product.title}
											{` (${getCartItemIssueLabel(item)})`}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}

					<div className="shrink-0" data-base-ui-swipe-ignore="">
						<CartPriceChangeAlert items={items} />
					</div>

					<div className="min-h-0 flex-1">
						{/* `fadeFromClass` : le défaut est `from-background`, or la liste est
						    posée sur le panneau en `bg-muted`. Sans override, le fondu de
						    haut et de bas partait d'une couleur qui n'est pas celle du fond. */}
						<ScrollFade
							axis="vertical"
							className="h-full overscroll-contain"
							fadeFromClass="from-muted"
							hideScrollbar={false}
						>
							{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- iOS Safari + VO drop implicit list role when list-style:none */}
							<ul role="list" className="space-y-3 px-6 py-4">
								<AnimatePresence mode="popLayout" initial={false}>
									{items.map((item, index) => (
										/* Pas d'animation de `height` (relayout à chaque frame) : `layout` +
										   `mode="popLayout"` sortent l'item du flux et font glisser ses voisins
										   via transform — même effet de collapse, sans jank.

										   ⚠️ **Surtout pas d'`overflow-hidden` ici.** La ligne peint
										   volontairement hors de sa boîte : rotation ±0,4° du tirage
										   (1,19 px de débord au coin), `shadow-sm`, le halo de survol de
										   `CARD_SURFACE_HOVER` (30 px de flou) et l'ombre de focus de
										   `CARD_SURFACE_FOCUS`. Un clip les rognait tous les quatre — donc
										   aussi une affordance CLAVIER, pas seulement de l'esthétique. Il
										   ne protégeait rien : l'animation de sortie est `opacity + scale`,
										   jamais `height`. Verrouillé par
										   `cart-sheet-list-not-clipped.regression.test.tsx`. */
										<m.li
											key={item.id}
											layout
											initial={{ opacity: 0, scale: 0.95 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.95 }}
											transition={shouldReduceMotion ? { duration: 0 } : MOTION_CONFIG.spring.list}
											className="origin-top"
										>
											<CartSheetItemRow
												item={item}
												onClose={close}
												isMobile={isMobile}
												index={index}
											/>
										</m.li>
									))}
								</AnimatePresence>
							</ul>
						</ScrollFade>
					</div>
				</>
			)}
			{recommendations}
			{hasItems && (
				<CartSheetFooter
					totalItems={totalItems}
					subtotal={subtotal}
					isPending={isPending}
					hasStockIssues={hasStockIssues}
					onClose={close}
				/>
			)}
		</>
	);
}

export function CartSheet({ cart, recommendations }: CartSheetProps) {
	const { isOpen, close } = useSheet("cart");
	const shouldReduceMotion = useReducedMotion();
	const isMobile = useIsMobile();
	const haptic = useHaptic();
	const [isPending, startTransition] = useTransition();
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const [optimisticCart, updateOptimisticCart] = useOptimistic(cart, cartReducer);

	const items = optimisticCart.items;
	const hasItems = items.length > 0;
	const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
	const subtotal = items.reduce((sum, item) => sum + getCartItemSubtotal(item), 0);
	const itemsWithIssues = items.filter(hasCartItemIssue);
	const hasStockIssues = itemsWithIssues.length > 0;

	const cartOptimisticValue = {
		updateOptimisticCart,
		isPending,
		startTransition,
	};

	const handleOpenChange = (open: boolean) => {
		if (open) {
			// Snapshot the element that had focus so we can restore it after close.
			// Vaul/Radix restore natively to the trigger, but when the sheet is opened
			// programmatically (FAB, navbar badge, Cmd+K palette), the activeElement
			// may not be the cart trigger — so we snapshot explicitly. Falls back to
			// the cart target (for fly-to-cart animation).
			const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			previousFocusRef.current =
				active ?? document.querySelector<HTMLElement>(`[${CART_TARGET_ATTR}]`);
			// Blur trigger before sheet opens to prevent aria-hidden conflict:
			// Vaul/Radix sets aria-hidden on the header before focus moves to sheet content
			active?.blur();
			haptic("selection");
		} else {
			haptic("selection");
			close();
			// Return focus to the saved element after Vaul/Radix portal teardown.
			// Double rAF aligns with Vaul's animation cycle: first frame settles
			// the unmount commit, second frame ensures focus is applied after
			// any native focus restoration the primitive may have queued.
			const target = previousFocusRef.current;
			if (target && document.contains(target)) {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => target.focus({ preventScroll: true }));
				});
			}
			previousFocusRef.current = null;
		}
	};

	const handleOverlayClick = () => {
		haptic("selection");
	};

	const bodyProps: CartSheetBodyProps = {
		items,
		hasItems,
		totalItems,
		subtotal,
		hasStockIssues,
		itemsWithIssues,
		isPending,
		isMobile,
		close,
		recommendations: isMobile ? undefined : recommendations,
		shouldReduceMotion,
	};

	return (
		<CartCloseContext.Provider value={close}>
			<CartOptimisticContext.Provider value={cartOptimisticValue}>
				{isMobile ? (
					// `handleOnly` : trois gestes se disputaient les mêmes pixels — swipe
					// horizontal de suppression d'article, scroll vertical de la liste, et
					// drag-to-dismiss du panneau. Le panier se fermait par accident pendant
					// qu'on manipulait une ligne. La fermeture par GESTE passe donc par la
					// seule poignée ; le bouton « Fermer » de l'en-tête et le scrim sont les
					// deux autres sorties — cf. `CartSheetHeaderContent` et la hauteur
					// ci-dessous, qui doivent rester cohérents avec ce commentaire.
					<Drawer open={isOpen} onOpenChange={handleOpenChange} handleOnly>
						<DrawerContent
							// 85 dvh, et pas 100 : à hauteur pleine le panneau recouvrait la
							// TOTALITÉ du scrim, qui n'avait donc plus un pixel tapable. Les
							// 15 dvh restants rendent la boutique visible et le scrim cliquable
							// — c'est la géométrie qui décide si le scrim existe.
							//
							// `pb-0` : la primitive pose `pb-[max(1rem,env(safe-area-inset-bottom))]`
							// sur les drawers du bas, et `CartSheetFooter` posait déjà son propre
							// `pb-4` — soit ≥ 32 px de vide sous « Continuer mes achats », sur une
							// hauteur désormais bornée. Un seul propriétaire désormais, et c'est le
							// FOOTER : lui seul existe sur les deux formats, et il porte la même
							// formule `max(1rem, safe-area)` — sinon retirer celle-ci ici ferait
							// passer le CTA sous la barre d'accueil iPhone.
							//
							// ⚠️ `bg-muted` OPAQUE, jamais `bg-muted/40` : cette classe écrase le
							// `bg-background` de la primitive (tailwind-merge, même groupe
							// `bg-color`), et c'est la SEULE surface pleine du panneau. Une
							// alpha ici ne « teinte » rien : elle laisse voir le scrim
							// `bg-black/50` et la page derrière, ce qui composite le panneau en
							// gris sale (~#AAA) et le fait varier selon le contenu de la page.
							className="group/sheet bg-muted mt-0 flex h-[85dvh] max-h-[85dvh] flex-col gap-0 px-0 pb-0"
							data-pending={isPending ? "" : undefined}
							aria-busy={isPending}
							onOverlayClick={handleOverlayClick}
						>
							<DrawerHeader className="bg-background shrink-0 border-b px-6 py-3">
								<CartSheetHeaderContent
									hasItems={hasItems}
									totalItems={totalItems}
									isPending={isPending}
									Title={DrawerTitle}
									Description={DrawerDescription}
									Close={DrawerClose}
								/>
							</DrawerHeader>
							<CartSheetBody {...bodyProps} />
						</DrawerContent>
						<RemoveCartItemAlertDialog />
						<ClearCartAlertDialog />
					</Drawer>
				) : (
					<Sheet direction="right" open={isOpen} onOpenChange={handleOpenChange}>
						<SheetContent
							// `pb-0` : la marge basse appartient au footer, sur les deux formats.
							// `bg-muted` OPAQUE : cf. le commentaire de la branche mobile ci-dessus.
							className="group/sheet bg-muted flex w-full flex-col gap-0 p-0 pb-0 sm:max-w-lg"
							data-pending={isPending ? "" : undefined}
							aria-busy={isPending}
							onOverlayClick={handleOverlayClick}
							// Le bouton de la primitive est ancré au POPUP, celui de l'en-tête
							// à l'EN-TÊTE : deux centres à 8 px l'un de l'autre. On n'en garde
							// qu'un, dans la rangée flex de l'en-tête.
							showCloseButton={false}
						>
							<SheetHeader className="bg-background shrink-0 border-b px-6 py-3">
								<CartSheetHeaderContent
									hasItems={hasItems}
									totalItems={totalItems}
									isPending={isPending}
									Title={SheetTitle}
									Description={SheetDescription}
									Close={SheetClose}
								/>
							</SheetHeader>
							<CartSheetBody {...bodyProps} />
						</SheetContent>
						<RemoveCartItemAlertDialog />
						<ClearCartAlertDialog />
					</Sheet>
				)}
			</CartOptimisticContext.Provider>
		</CartCloseContext.Provider>
	);
}
