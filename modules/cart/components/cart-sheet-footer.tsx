import { SheetFooter } from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { formatEuro } from "@/shared/utils/format-euro";
import { AnimatedNumber } from "@/shared/components/animated-number";
import Link from "next/link";

interface CartSheetFooterProps {
	totalItems: number;
	subtotal: number;
	isPending: boolean;
	hasStockIssues: boolean;
	onClose: () => void;
}

export function CartSheetFooter({
	totalItems,
	subtotal,
	isPending,
	hasStockIssues,
	onClose,
}: CartSheetFooterProps) {
	return (
		<SheetFooter className="mt-auto shrink-0 border-t px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
			<div className="w-full space-y-2">
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
				{/* SR-only live region for subtotal changes */}
				<div aria-live="polite" aria-atomic="true" className="sr-only">
					Sous-total : {formatEuro(subtotal)}
				</div>

				{/* Shipping estimate */}
				<p className="text-muted-foreground text-xs">Livraison à partir de 6,00 €</p>

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
						<Link href="/paiement" onClick={onClose}>
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
