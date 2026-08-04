"use client";

import { WarningIcon } from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

import type { CreateProductFormInstance } from "./create-product-form-types";
import { PricingFields } from "./shared/pricing-card";
import { FORM_SECTION_ACCENT_CLASS, FORM_SECTION_CARD_CLASS } from "./shared/shared-styles";
import { StockField } from "./shared/stock-card";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

interface CreateProductPriceStockCardProps {
	form: CreateProductFormInstance;
}

/**
 * Section « Le prix et le stock » du formulaire de création.
 *
 * Réunit les deux prix et la quantité, qui étaient jusqu'ici deux cartes distinctes
 * de la colonne latérale. Elles sont indissociables à la lecture — « combien ça
 * coûte » et « combien il y en a » se décident ensemble — et le prix comparé valide
 * d'ailleurs contre le prix de vente.
 *
 * ## L'alerte de publication vit ICI, pas dans le pied collant
 *
 * Elle était rendue dans `AdminFormFooter`, avec la règle d'établi. Deux raisons de
 * l'avoir déplacée, et la seconde suffit :
 *
 * - elle décrit un état du STOCK, donc de cette section — pas une décision d'envoi ;
 * - sous `md`, ce pied est COLLANT au-dessus de la barre du bas admin. Titre,
 *   description et icône s'ajoutaient en permanence aux ~130px de la barre, sur un
 *   écran de téléphone déjà amputé. Une alerte qui ne se ferme pas n'a rien à faire
 *   dans un bandeau qui ne défile jamais.
 */
export function CreateProductPriceStockCard({ form }: CreateProductPriceStockCardProps) {
	return (
		<Card
			role="region"
			aria-label="Le prix et le stock"
			data-accent="mint"
			className={cn(FORM_SECTION_CARD_CLASS, FORM_SECTION_ACCENT_CLASS)}
			style={{ viewTransitionName: "product-create-price" }}
		>
			<CardHeader className="px-0 sm:px-0 md:px-6">
				<FormSectionTitle>Le prix et le stock</FormSectionTitle>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 md:px-6">
				<PricingFields
					form={form}
					priceFieldName="initialSku.priceInclTaxEuros"
					compareAtPriceFieldName="initialSku.compareAtPriceEuros"
					hintIdPrefix="create-product-price"
				/>
				{/*
				 * ⚠️ L'aide dit la CONSÉQUENCE, elle n'invite plus au zéro.
				 *
				 * Elle lisait « Laisse vide ou 0 si le bijou est en rupture » alors que le
				 * statut par défaut de ce formulaire est « En vente » : suivre l'aide
				 * déclenchait aussitôt l'alerte « Publication incohérente » de la règle
				 * d'établi, à un écran de distance. Deux copies co-visibles qui se
				 * contredisaient.
				 */}
				<StockField
					form={form}
					inventoryFieldName="initialSku.inventory"
					hintIdPrefix="create-product-stock"
					hint="Un bijou à 0 ne peut pas être mis en vente — garde-le en brouillon le temps de le fabriquer"
				/>

				{/*
				 * Sélecteur en TUPLE `as const`, comme la règle d'établi : un sélecteur
				 * qui rend un `boolean` nu fait échouer l'inférence de `form.Subscribe`
				 * (TS retombe sur la surcharge « children: ReactNode »).
				 */}
				<form.Subscribe
					selector={(state) =>
						[state.values.status, Number(state.values.initialSku.inventory)] as const
					}
				>
					{([status, inventory]) =>
						status === "PUBLIC" && inventory <= 0 ? (
							<Alert variant="warning" data-slot="publication-warning">
								<WarningIcon aria-hidden="true" />
								<AlertTitle>Publication incohérente</AlertTitle>
								<AlertDescription>
									Impossible de mettre en vente un bijou à zéro en stock. Repasse-le en brouillon,
									ou renseigne un stock.
								</AlertDescription>
							</Alert>
						) : null
					}
				</form.Subscribe>
			</CardContent>
		</Card>
	);
}
