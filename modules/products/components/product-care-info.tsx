import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { formatShippingPrice } from "@/modules/orders/services/shipping.service";

interface ProductCareInfoProps {
	primaryMaterial?: string | null;
}

/**
 * ProductCareInfo - Informations d'entretien et de livraison
 *
 * Placé APRÈS le bouton d'ajout au panier car moins critique pour la décision d'achat.
 *
 * Responsabilités :
 * - Conseils d'entretien du bijou (accordéon)
 * - Informations de livraison et emballage (accordéon)
 */
export function ProductCareInfo({ primaryMaterial }: ProductCareInfoProps) {
	return (
		<Accordion type="multiple" defaultValue={["shipping"]} className="w-full">
			{/* Section Livraison */}
			<AccordionItem value="shipping">
				<AccordionTrigger className="hover:bg-muted/50 -mx-2 rounded-lg px-2 text-sm/6 font-semibold tracking-normal antialiased transition-colors">
					Livraison
				</AccordionTrigger>
				<AccordionContent className="text-muted-foreground space-y-3 text-sm/6 tracking-normal antialiased">
					{/* Emballage */}
					<div>
						<p className="text-foreground font-medium">Emballage soigné</p>
						<p>Chaque produit arrive dans un joli écrin</p>
					</div>

					{/* France */}
					<div>
						<p className="text-foreground font-medium">France métropolitaine</p>
						<p>
							{formatShippingPrice(SHIPPING_RATES.FR.amount)} · {SHIPPING_RATES.FR.minDays}-
							{SHIPPING_RATES.FR.maxDays} jours ouvrés
						</p>
					</div>

					{/* Europe */}
					<div>
						<p className="text-foreground font-medium">Union Européenne</p>
						<p>
							{formatShippingPrice(SHIPPING_RATES.EU.amount)} · {SHIPPING_RATES.EU.minDays}-
							{SHIPPING_RATES.EU.maxDays} jours ouvrés
						</p>
					</div>
				</AccordionContent>
			</AccordionItem>

			{/* Section Entretien */}
			<AccordionItem value="care">
				<AccordionTrigger className="hover:bg-muted/50 -mx-2 rounded-lg px-2 text-sm/6 font-semibold tracking-normal antialiased transition-colors">
					Entretien
				</AccordionTrigger>
				<AccordionContent className="text-muted-foreground space-y-3 text-sm/6 tracking-normal antialiased">
					<p>
						J'ai passé des heures à créer votre produit (parfois avec quelques galères), alors voici
						mes conseils pour qu'il dure longtemps :
					</p>
					<ul className="list-inside list-disc space-y-2">
						<li>Évitez l'eau, les parfums et les produits cosmétiques (ça n'aime pas trop)</li>
						<li>Rangez-le dans son petit écrin après chaque utilisation</li>
						<li>Un petit coup de chiffon doux de temps en temps, et c'est nickel</li>
						{primaryMaterial?.toLowerCase().includes("argent") && (
							<li>Pour l'argent : un chiffon anti-oxydation, c'est la base</li>
						)}
						{primaryMaterial?.toLowerCase().includes("or") && (
							<li>Pour l'or : de l'eau tiède avec un peu de savon fait l'affaire</li>
						)}
					</ul>
					<p className="text-xs italic">
						Votre produit a été créé avec passion, prenez-en soin et il vous le rendra !
					</p>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
