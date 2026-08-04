"use client";

import { FieldLabel } from "@/shared/components/forms";
import { ColorMultiSelectField } from "@/modules/colors/components/admin/color-multi-select-field";
import { MaterialMultiSelectField } from "@/modules/materials/components/admin/material-multi-select-field";

type ColorOption = { id: string; name: string; hex: string };
type MaterialOption = { id: string; name: string };

export interface VariantAttributeFieldsProps {
	// `any` assumé : ces champs sont montés par trois instances de formulaire
	// distinctes (création produit, édition produit, variante). Décision d'API,
	// pas un défaut de typage — cf. le même parti pris sur les 5 cards admin.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	colors: ColorOption[];
	materials: MaterialOption[];
	/** Nom du champ TanStack pour les couleurs (e.g. "initialSku.colorIds", "colorIds"). */
	colorIdsFieldName: string;
	/** Nom du champ pour les matériaux. */
	materialsFieldName: string;
	/** Nom du champ pour la taille. */
	sizeFieldName: string;
}

/**
 * Les trois attributs qui décrivent la pièce elle-même : teintes, matériaux, taille.
 *
 * Extraits de `VariantCard` pour être montés à deux endroits sans duplication :
 * - dans `VariantCard`, qui leur donne un chrome de section « Variante » (édition
 *   produit, formulaires de variante) ;
 * - directement dans la section « Le bijou » du formulaire de création, où ils
 *   rejoignent le titre et la description — à la création il n'existe qu'une
 *   variante, et la séparer de la pièce n'apportait qu'une carte de plus.
 *
 * ⚠️ Les noms de champs restent paramétrables : `id === field.name` est un contrat
 * verrouillé par `field-name-id-contract.regression.test.ts`, donc ces champs ne
 * doivent jamais être montés deux fois simultanément avec le même nom.
 */
export function VariantAttributeFields({
	form,
	colors,
	materials,
	colorIdsFieldName,
	materialsFieldName,
	sizeFieldName,
}: VariantAttributeFieldsProps) {
	return (
		<>
			<form.AppField name={colorIdsFieldName}>
				{(field: {
					name: string;
					state: { value: string[] };
					handleChange: (v: string[]) => void;
				}) => (
					<ColorMultiSelectField
						fieldName={field.name}
						value={field.state.value}
						onValueChange={(ids) => field.handleChange(ids)}
						options={colors}
					/>
				)}
			</form.AppField>

			<form.AppField name={materialsFieldName}>
				{(field: {
					name: string;
					state: { value: string[] };
					handleChange: (v: string[]) => void;
				}) => (
					<MaterialMultiSelectField
						fieldName={field.name}
						value={field.state.value}
						onValueChange={(ids) => field.handleChange(ids)}
						options={materials}
					/>
				)}
			</form.AppField>

			<form.AppField name={sizeFieldName}>
				{(field: {
					InputGroupField: React.ComponentType<{
						placeholder: string;
						inputMode: "text" | "numeric";
						enterKeyHint: "next" | "done";
						autoCapitalize: "none" | "sentences" | "words";
						autoComplete: string;
					}>;
				}) => (
					<div className="space-y-2">
						{/* `htmlFor` = `id` posé par `InputGroupField` — cf. `pricing-card.tsx`. */}
						<FieldLabel htmlFor={sizeFieldName} optional>
							Taille
						</FieldLabel>
						<field.InputGroupField
							placeholder="Ex: 52, Ajustable, 18cm…"
							inputMode="text"
							enterKeyHint="next"
							autoCapitalize="none"
							autoComplete="off"
						/>
					</div>
				)}
			</form.AppField>
		</>
	);
}
