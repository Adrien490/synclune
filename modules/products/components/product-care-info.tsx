import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Droplets, Package, Sparkles, Truck } from "lucide-react";

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
		<Accordion type="multiple" className="w-full">
			{/* Section Entretien */}
			<AccordionItem value="care">
				<AccordionTrigger className="text-sm/6 tracking-normal antialiased font-semibold">
					<div className="flex items-center gap-2">
						<Droplets className="w-4 h-4 text-primary" aria-hidden="true" />
						<span>Entretien de votre bijou</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="text-sm/6 tracking-normal antialiased text-muted-foreground space-y-3">
					<p>
						J'ai passé des heures à créer votre bijou (parfois avec quelques galères), alors voici mes conseils pour qu'il dure longtemps :
					</p>
					<ul className="space-y-2 list-disc list-inside">
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
						Votre bijou a été créé avec passion, prenez-en soin et il vous le rendra ! ✨
					</p>
				</AccordionContent>
			</AccordionItem>

			{/* Section Livraison */}
			<AccordionItem value="shipping">
				<AccordionTrigger className="text-sm/6 tracking-normal antialiased font-semibold">
					<div className="flex items-center gap-2">
						<Truck className="w-4 h-4 text-primary" aria-hidden="true" />
						<span>Livraison</span>
					</div>
				</AccordionTrigger>
				<AccordionContent className="text-sm/6 tracking-normal antialiased text-muted-foreground space-y-3">
					<div className="space-y-2">
						<div className="flex items-start gap-2">
							<Package className="w-4 h-4 text-primary shrink-0 mt-0.5" />
							<div>
								<p className="font-medium text-foreground">
									Emballage soigné
								</p>
								<p>Chaque bijou arrive dans un joli écrin</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<Truck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
							<div>
								<p className="font-medium text-foreground">Délais de livraison</p>
								<p>2-4 jours ouvrés en France</p>
								<p>4-7 jours ouvrés en Europe</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
							<div>
								<p className="font-medium text-foreground">Les frais de port</p>
								<p>Calculés au moment du paiement selon votre destination (France et Union européenne)</p>
							</div>
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
