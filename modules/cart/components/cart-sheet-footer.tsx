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
		<SheetFooter className="px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t mt-auto shrink-0">
			<div className="w-full space-y-2">
				{/* Subtotal */}
				<div className="flex justify-between items-center">
					<span className="font-semibold">
						Sous-total ({totalItems} article{totalItems > 1 ? "s" : ""})
					</span>
					<span
						aria-busy={isPending}
						className="tabular-nums font-bold text-lg transition-opacity duration-200 group-has-[[data-pending]]/sheet:opacity-50 group-has-[[data-pending]]/sheet:motion-safe:animate-pulse"
					>
						<AnimatedNumber value={subtotal} formatter={formatEuro} />
					</span>
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
						className="w-full shadow-md hover:shadow-lg transition-shadow group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
					>
						<Link href="/paiement" onClick={onClose}>Passer commande</Link>
					</Button>
				)}

				{/* Secondary link */}
				<div className="text-center">
					<button
						type="button"
						onClick={onClose}
						className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none group-has-[[data-pending]]/sheet:pointer-events-none group-has-[[data-pending]]/sheet:opacity-50"
					>
						Continuer mes achats
					</button>
				</div>
			</div>
		</SheetFooter>
	);
}
