"use client";

import { useDeferredValue, useOptimistic, useRef, useTransition } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/shared/components/ui/drawer";
import ScrollFade from "@/shared/components/scroll-fade";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { ShoppingBag } from "lucide-react";
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
				<div className="flex min-h-0 flex-1 flex-col px-6 py-8" role="status">
					<Empty variant="borderless" className="flex-1">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<ShoppingBag className="size-6" />
							</EmptyMedia>
							<EmptyTitle>Votre panier est vide !</EmptyTitle>
						</EmptyHeader>
						<EmptyDescription>
							Chaque bijou est une pièce unique, fabriquée à la main avec amour. Trouvez celui qui
							vous correspond !
						</EmptyDescription>
						<EmptyActions>
							<Button
								asChild
								size="lg"
								className="group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
							>
								<Link href="/produits" onClick={close}>
									Découvrir la boutique
								</Link>
							</Button>
							<Button
								asChild
								variant="link"
								className="text-muted-foreground group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
							>
								<Link href="/collections" onClick={close}>
									Voir les collections
								</Link>
							</Button>
						</EmptyActions>
					</Empty>
				</div>
			) : (
				<>
					{hasStockIssues && (
						<div
							id="stock-issues-alert"
							className="bg-destructive/10 border-destructive/20 shrink-0 border-b px-6 py-2.5"
							role="alert"
							aria-label="Problèmes de stock dans le panier"
						>
							<p className="text-destructive text-xs font-medium">
								Ajustez votre panier pour continuer
							</p>
							<ul className="text-destructive/80 mt-1 space-y-0.5 text-[11px]">
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

					<div className="shrink-0">
						<CartPriceChangeAlert items={items} />
					</div>

					<div className="min-h-0 flex-1">
						<ScrollFade axis="vertical" className="h-full" hideScrollbar={false}>
							<div className="space-y-3 px-6 py-4">
								<AnimatePresence mode="popLayout" initial={false}>
									{items.map((item) => (
										<m.div
											key={item.id}
											layout
											initial={{ opacity: 0, height: 0, scale: 0.95 }}
											animate={{ opacity: 1, height: "auto", scale: 1 }}
											exit={{ opacity: 0, height: 0, scale: 0.95 }}
											transition={shouldReduceMotion ? { duration: 0 } : MOTION_CONFIG.spring.list}
											className="origin-top overflow-hidden"
										>
											<CartSheetItemRow item={item} onClose={close} isMobile={isMobile} />
										</m.div>
									))}
								</AnimatePresence>
							</div>
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

	const items = optimisticCart?.items ?? [];
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
					<Drawer open={isOpen} onOpenChange={handleOpenChange}>
						<DrawerContent
							className="group/sheet mt-0 flex h-[var(--vvh,100dvh)] max-h-[var(--vvh,100dvh)] flex-col gap-0 rounded-t-none px-0 pt-[env(safe-area-inset-top)]"
							data-pending={isPending ? "" : undefined}
							aria-busy={isPending}
							onOverlayClick={handleOverlayClick}
						>
							<DrawerHeader className="relative shrink-0 border-b px-6 py-3">
								<DrawerTitle
									aria-label={
										hasItems
											? `Mon panier, ${totalItems} article${totalItems > 1 ? "s" : ""}`
											: undefined
									}
								>
									Mon panier
									{hasItems && (
										<span
											aria-hidden="true"
											className="transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50"
										>
											{" "}
											({totalItems})
										</span>
									)}
								</DrawerTitle>
								<DrawerDescription className="sr-only">
									Gérez les articles de votre panier
								</DrawerDescription>
								{hasItems && (
									<div className="absolute top-1/2 right-4 -translate-y-1/2">
										<CartClearButton disabled={isPending} />
									</div>
								)}
							</DrawerHeader>
							<CartSheetBody {...bodyProps} />
						</DrawerContent>
						<RemoveCartItemAlertDialog />
						<ClearCartAlertDialog />
					</Drawer>
				) : (
					<Sheet direction="right" open={isOpen} onOpenChange={handleOpenChange}>
						<SheetContent
							className="group/sheet flex w-full flex-col gap-0 p-0 pb-[env(safe-area-inset-bottom)] sm:max-w-lg"
							data-pending={isPending ? "" : undefined}
							aria-busy={isPending}
							onOverlayClick={handleOverlayClick}
						>
							<SheetHeader className="relative shrink-0 border-b px-6 py-4">
								<SheetTitle
									aria-label={
										hasItems
											? `Mon panier, ${totalItems} article${totalItems > 1 ? "s" : ""}`
											: undefined
									}
								>
									Mon panier
									{hasItems && (
										<span
											aria-hidden="true"
											className="transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50"
										>
											{" "}
											({totalItems})
										</span>
									)}
								</SheetTitle>
								<SheetDescription className="sr-only">
									Gérez les articles de votre panier
								</SheetDescription>
								{hasItems && (
									// right-16 = right-4 + size-10, leaves room for the Sheet's
									// built-in close button (Radix renders top-right by default).
									<div className="absolute top-1/2 right-16 -translate-y-1/2">
										<CartClearButton disabled={isPending} />
									</div>
								)}
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
