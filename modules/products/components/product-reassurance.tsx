import Link from "next/link";
import {
	Truck,
	ShieldCheck,
	RotateCcw,
	CreditCard,
	Heart,
} from "lucide-react";

interface ProductReassuranceProps {
	productSlug: string;
}

/**
 * ProductReassurance - Badges de réassurance et liens
 *
 * Composant Server (RSC) pour le contenu statique :
 * - Trust badges (paiement sécurisé, retours, méthodes de paiement)
 * - Information livraison
 * - Liens personnalisation et questions
 *
 * Séparé de AddToCartForm pour respecter la séparation SSR/Client.
 */
export function ProductReassurance({ productSlug }: ProductReassuranceProps) {
	return (
		<div className="space-y-3 pt-2">
			{/* Trust badges */}
			<div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground py-2">
				<div className="flex items-center gap-1.5">
					<ShieldCheck
						className="w-4 h-4 text-green-600"
						aria-hidden="true"
					/>
					<span>Paiement sécurisé</span>
				</div>
				<div className="flex items-center gap-1.5">
					<RotateCcw className="w-4 h-4 text-blue-600" aria-hidden="true" />
					<span>Retours 14 jours</span>
				</div>
				<div className="flex items-center gap-1.5">
					<CreditCard className="w-4 h-4 text-primary" aria-hidden="true" />
					<span>CB, PayPal</span>
				</div>
			</div>

			{/* Info livraison */}
			<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
				<Truck className="w-3.5 h-3.5" aria-hidden="true" />
				<span>Livraison France et UE</span>
			</div>

			{/* Lien personnalisation */}
			<Link
				href={`/personnalisation?product=${productSlug}`}
				className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
			>
				<Heart className="w-4 h-4" aria-hidden="true" />
				<span>Envie de personnalisation ?</span>
			</Link>
		</div>
	);
}
