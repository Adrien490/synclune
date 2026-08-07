"use client";

import { CurrencyEurIcon } from "@phosphor-icons/react/ssr";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { InputGroupAddon } from "@/shared/components/ui/input-group";

import { FORM_SECTION_CARD_CLASS } from "./shared-styles";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

/**
 * ⚠️ Copie EXACTE du message du refine serveur (`skuPriceRefinement`,
 * `product-mutation.schemas.ts`), et même comparateur : **strict**.
 *
 * Le client validait `value < price` sous un libellé « supérieur ou égal » là où le
 * serveur refuse en `>` — donc un ancien prix ÉGAL au prix de vente passait le
 * formulaire, allumait le bouton, partait sur le réseau et se faisait rejeter. Le
 * serveur a raison (un prix barré égal est un affichage promo mensonger) : c'est le
 * client qui s'aligne, comparateur ET libellé.
 */
const COMPARE_AT_PRICE_ERROR = "Le prix comparé doit être strictement supérieur au prix de vente";

/**
 * Le rappel légal du prix barré — art. L. 112-1-1 du Code de la consommation.
 *
 * ## Pourquoi ce texte existe, et pourquoi il n'est PAS une validation
 *
 * Toute annonce de réduction de prix doit référencer **le prix le plus bas
 * pratiqué dans les 30 jours précédents**, et des remises successives ne
 * réinitialisent pas cette référence. Les sanctions récentes ne sont pas
 * théoriques : SHEIN 40 M€ (juillet 2025), PrettyLittleThing 1,3 M€ (septembre
 * 2025), et la loi 2025-594 permet désormais aux agents d'exiger l'accès aux
 * algorithmes de prix.
 *
 * Or `compareAtPrice` est un champ LIBRE : sa seule contrainte, côté client comme
 * côté serveur, est d'être strictement supérieur au prix de vente. Rien dans le
 * schéma Prisma ni dans le code ne le rattache à un historique de prix.
 *
 * ⚠️ **Le rendre vérifiable par la machine demanderait un historique de prix en
 * base** (table `SkuPriceHistory`, calcul du plus-bas glissant, refus à
 * l'écriture) — un chantier à part entière, disproportionné pour une opératrice
 * unique qui saisit quelques promotions par an. L'arbitrage retenu le 2026-08-06
 * est donc explicite : **un rappel au point de saisie**, là où la décision se
 * prend, plutôt qu'un moteur. C'est un garde-fou humain, et il est assumé comme
 * tel — pas un oubli de validation.
 *
 * Condition de réouverture : le jour où les promotions deviennent fréquentes ou
 * automatisées, ce commentaire ne suffit plus et l'historique devient nécessaire.
 */
const COMPARE_AT_PRICE_LEGAL_HINT =
	"Doit être le prix le plus bas pratiqué ces 30 derniers jours (art. L. 112-1-1) — pas un prix de référence gonflé.";

export interface PricingFieldsProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	/** Nom du champ TanStack pour le prix de vente (e.g. "initialSku.priceInclTaxEuros"). */
	priceFieldName: string;
	/** Nom du champ pour le prix comparé (e.g. "initialSku.compareAtPriceEuros"). */
	compareAtPriceFieldName: string;
	/** Identifiant unique pour les aria-describedby (default "pricing-card"). */
	hintIdPrefix?: string;
}

export interface PricingCardProps extends PricingFieldsProps {
	viewTransitionName?: string;
}

/**
 * Les deux champs de prix, sans chrome de section.
 *
 * Extraits pour être montés soit dans `PricingCard` (édition produit, variantes),
 * soit directement dans la section « Le prix et le stock » du formulaire de
 * création, qui les réunit avec le stock.
 */
export function PricingFields({
	form,
	priceFieldName,
	compareAtPriceFieldName,
	hintIdPrefix = "pricing-card",
}: PricingFieldsProps) {
	const validateCompareAtPrice = ({
		value,
		fieldApi,
	}: {
		value: number | null | undefined;
		fieldApi: {
			form: { getFieldValue: (name: string) => number | null | undefined };
		};
	}) => {
		if (!value) return undefined;
		const price = fieldApi.form.getFieldValue(priceFieldName);
		return price && value <= price ? COMPARE_AT_PRICE_ERROR : undefined;
	};

	return (
		<>
			<form.AppField
				name={priceFieldName}
				validators={{
					onChange: ({ value }: { value: number | null }) =>
						!value || value <= 0 ? "Le prix doit être supérieur à 0" : undefined,
				}}
			>
				{(field: {
					InputGroupField: React.ComponentType<{
						type: string;
						step: string;
						required?: boolean;
						enterKeyHint: "next" | "done";
						"aria-describedby": string;
						children?: React.ReactNode;
					}>;
				}) => (
					<div className="space-y-2">
						{/*
						 * `htmlFor` = le nom du champ, qui est aussi l'`id` que pose
						 * `InputGroupField` (contrat verrouillé par
						 * `field-name-id-contract.regression.test.ts`). Sans lui, ce `<label>`
						 * ne s'associait à rien : l'input n'avait AUCUN nom accessible et
						 * s'annonçait par son seul indice (« Le prix que paiera le client »).
						 */}
						<FieldLabel htmlFor={priceFieldName} required>
							Prix de vente final
						</FieldLabel>
						<field.InputGroupField
							type="number"
							step="0.01"
							required
							enterKeyHint="next"
							aria-describedby={`${hintIdPrefix}-sale-hint`}
						>
							<InputGroupAddon>
								<CurrencyEurIcon className="size-4" />
							</InputGroupAddon>
						</field.InputGroupField>
						<p id={`${hintIdPrefix}-sale-hint`} className="text-muted-foreground text-xs">
							Le prix que paiera le client
						</p>
					</div>
				)}
			</form.AppField>

			<form.AppField
				name={compareAtPriceFieldName}
				validators={{
					onChangeListenTo: [priceFieldName],
					onChange: validateCompareAtPrice,
					onBlur: validateCompareAtPrice,
				}}
			>
				{(field: {
					InputGroupField: React.ComponentType<{
						type: string;
						step: string;
						enterKeyHint: "next" | "done";
						"aria-describedby": string;
						children?: React.ReactNode;
					}>;
				}) => (
					<div className="space-y-2">
						<FieldLabel htmlFor={compareAtPriceFieldName} optional>
							Ancien prix (affiché barré)
						</FieldLabel>
						<field.InputGroupField
							type="number"
							step="0.01"
							enterKeyHint="done"
							aria-describedby={`${hintIdPrefix}-compare-hint`}
						>
							<InputGroupAddon>
								<CurrencyEurIcon className="size-4" />
							</InputGroupAddon>
						</field.InputGroupField>
						<p id={`${hintIdPrefix}-compare-hint`} className="text-muted-foreground text-xs">
							Sera affiché barré à côté du prix actuel (ex:{" "}
							<span className="line-through">45€</span> → 39€).
							{/* Le rappel légal est dans le MÊME `aria-describedby` que l'exemple,
							    pas dans un bloc à part : au lecteur d'écran, un encadré frère du
							    champ ne s'annonce jamais à la saisie. */}
							<span className="text-foreground mt-1 block font-medium">
								{COMPARE_AT_PRICE_LEGAL_HINT}
							</span>
						</p>
					</div>
				)}
			</form.AppField>
		</>
	);
}

export function PricingCard({ viewTransitionName, ...fields }: PricingCardProps) {
	return (
		<Card
			role="region"
			aria-label="Tarification"
			className={FORM_SECTION_CARD_CLASS}
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 md:px-6">
				<FormSectionTitle>Tarification</FormSectionTitle>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 md:px-6">
				<PricingFields {...fields} />
			</CardContent>
		</Card>
	);
}
