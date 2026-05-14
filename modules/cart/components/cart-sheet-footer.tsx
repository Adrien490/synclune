"use client";

import { SheetFooter } from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { AnimatedNumber } from "@/shared/components/animations/animated-number";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { CartPromoCodeForm } from "./cart-promo-code-form";
import Link from "next/link";

interface CartSheetFooterProps {
	totalItems: number;
	subtotal: number;
	isPending: boolean;
	hasStockIssues: boolean;
	onClose: () => void;
	appliedDiscountCode?: string | null;
	discountAmount?: number | null;
}

export function CartSheetFooter({
	totalItems,
	subtotal,
	isPending,
	hasStockIssues,
	onClose,
	appliedDiscountCode = null,
	discountAmount = null,
}: CartSheetFooterProps) {
	const haptic = useHaptic();

	const handleCheckoutClick = () => {
		haptic("medium");
		onClose();
	};

	return (
		<SheetFooter className="mt-auto shrink-0 border-t px-6 pt-3 pb-4">
			<div className="w-full space-y-2">
				{/* Promo code disclosure — collapsed by default, chip when applied */}
				<CartPromoCodeForm
					appliedDiscountCode={appliedDiscountCode}
					discountAmount={discountAmount}
				/>

				{/* Subtotal */}
				<div className="flex items-center justify-between">
					<span className="font-semibold">
						Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
					</span>
					<span
						aria-busy={isPending}
						className="text-lg font-bold tabular-nums transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50 group-has-[[data-pending]]/sheet:motion-safe:animate-pulse"
					>
						<AnimatedNumber value={subtotal} formatter={formatEuro} />
					</span>
				</div>
				{/* Réduction appliquée — visible quand un code promo est actif */}
				{discountAmount !== null && discountAmount > 0 && (
					<div className="flex items-center justify-between text-sm text-green-700 dark:text-green-500">
						<span>Réduction{appliedDiscountCode ? ` (${appliedDiscountCode})` : ""}</span>
						<span className="tabular-nums">−{formatEuro(discountAmount)}</span>
					</div>
				)}
				{/* Hint frais postaux — réduit la friction à l'étape paiement */}
				<p className="text-muted-foreground text-xs">
					Frais postaux dès {formatEuro(SHIPPING_RATES.FR.amount)} — calculés à l&apos;étape
					suivante.
				</p>
				{/* SR-only live region for subtotal changes */}
				<div aria-live="polite" aria-atomic="true" className="sr-only">
					Sous-total : {formatEuro(subtotal)}
				</div>

				{/* Primary CTA */}
				{hasStockIssues ? (
					<Button
						size="lg"
						className="w-full"
						disabled
						aria-disabled="true"
						aria-describedby="stock-issues-alert"
					>
						Passer commande
					</Button>
				) : (
					<Button
						asChild
						size="lg"
						className="w-full shadow-md transition-shadow group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 hover:shadow-lg"
					>
						<Link href="/paiement" onClick={handleCheckoutClick}>
							Passer commande
						</Link>
					</Button>
				)}

				{/* Secondary link */}
				<div className="text-center">
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm text-sm underline underline-offset-4 transition-colors group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						Continuer mes achats
					</button>
				</div>
			</div>
		</SheetFooter>
	);
}
