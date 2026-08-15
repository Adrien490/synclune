"use client";

import { FieldLabel } from "@/shared/components/forms";

type ColorOption = { id: string; name: string; hex: string | null };
type MaterialOption = { id: string; name: string };

export interface VariantAttributeFieldsProps {
	// `any` assumé : ces champs sont montés par trois instances de formulaire
	// distinctes (création produit, édition produit, variante). Décision d'API,
	// pas un défaut de typage — cf. le même parti pris sur les 5 cards admin.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	colors: ColorOption[];
	materials: MaterialOption[];
	/** Nom du champ TanStack pour la couleur (e.g. "initialVariant.colorId", "colorId"). */
	colorFieldName: string;
	/** Nom du champ pour le matériau. */
	materialFieldName: string;
	/** Nom du champ pour la taille. */
	sizeFieldName: string;
}

/**
 * Les trois attributs qui décrivent la pièce elle-même : teinte, matériau, taille.
 *
 * Schéma lean (lot 2) : une variante porte UNE couleur et UN matériau (FK
 * nullables) — les champs sont des selects simples, plus des multi-selects M2M.
 *
 * ⚠️ Les noms de champs restent paramétrables : `id === field.name` est un contrat
 * verrouillé par `field-name-id-contract.regression.test.ts`, donc ces champs ne
 * doivent jamais être montés deux fois simultanément avec le même nom.
 */
export function VariantAttributeFields({
	form,
	colors,
	materials,
	colorFieldName,
	materialFieldName,
	sizeFieldName,
}: VariantAttributeFieldsProps) {
	const colorOptions = colors.map((c) => ({ value: c.id, label: c.name }));
	const materialOptions = materials.map((m) => ({ value: m.id, label: m.name }));

	return (
		<>
			<form.AppField name={colorFieldName}>
				{(field: {
					SelectField: React.ComponentType<{
						label?: string;
						placeholder?: string;
						optional?: boolean;
						clearable?: boolean;
						options: Array<{ value: string; label: string }>;
					}>;
				}) => (
					<field.SelectField
						label="Couleur"
						placeholder="Sans couleur"
						optional
						clearable
						options={colorOptions}
					/>
				)}
			</form.AppField>

			<form.AppField name={materialFieldName}>
				{(field: {
					SelectField: React.ComponentType<{
						label?: string;
						placeholder?: string;
						optional?: boolean;
						clearable?: boolean;
						options: Array<{ value: string; label: string }>;
					}>;
				}) => (
					<field.SelectField
						label="Matériau"
						placeholder="Sans matériau"
						optional
						clearable
						options={materialOptions}
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
