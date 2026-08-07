"use client";

import { InfoIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import { MATERIAL_DIALOG_ID } from "@/modules/materials/components/material-form-dialog";
import { FieldLabel } from "@/shared/components/forms";
import { MultiSelect } from "@/shared/components/multi-select/multi-select";
import { Button } from "@/shared/components/ui/button";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/overlay-store-provider";

interface MaterialOption {
	id: string;
	name: string;
}

interface MaterialMultiSelectFieldProps {
	/** Ids actuellement sélectionnés (ordre = priorité, 1er = principal). */
	value: string[];
	/** Callback de mise à jour. L'ordre du tableau doit être préservé par l'appelant. */
	onValueChange: (ids: string[]) => void;
	/** Liste complète des matériaux actifs (récupérée via getMaterialOptions). */
	options: MaterialOption[];
	/** Affiche le label/aide. Défaut: true. */
	showLabel?: boolean;
	/** Libellé du label affiché. Défaut: "Matériaux". */
	label?: string;
	/** Cap dur sur le nombre de matériaux. Défaut: ARRAY_LIMITS.SKU_MATERIALS. */
	maxSelected?: number;
	/** ID du champ (utilisé pour l'aria/label). */
	fieldName?: string;
}

/**
 * Champ multi-select pour les matériaux d'un SKU.
 *
 * Convention métier : l'ordre du tableau reflète la priorité d'affichage,
 * le 1er élément est le matériau « principal » utilisé pour SEO / care-tips.
 *
 * - Cap à `ARRAY_LIMITS.SKU_MATERIALS` (3) par défaut.
 * - Bouton « Créer un matériau » inline qui ouvre le dialog partagé.
 * - Aide visuelle indiquant la convention « 1er = principal ».
 */
export function MaterialMultiSelectField({
	value,
	onValueChange,
	options,
	showLabel = true,
	label = "Matériaux",
	maxSelected = ARRAY_LIMITS.SKU_MATERIALS,
	fieldName,
}: MaterialMultiSelectFieldProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const materialDialog = useDialog(MATERIAL_DIALOG_ID);

	const isAtCap = value.length >= maxSelected;
	// `Set` hoisté : sinon un `.includes()` par option rescanne toute la sélection.
	const selectedIds = new Set(value);

	// Au cap : grise (disabled) les options non sélectionnées plutôt que de les retirer.
	// L'utilisateur voit toujours le catalogue complet, comprend pourquoi il ne peut plus
	// cocher, et peut décocher une option existante pour libérer un slot.
	const mappedOptions = options.map((m) => ({
		value: m.id,
		label: m.name,
		disabled: isAtCap && !selectedIds.has(m.id),
	}));

	const handleValueChange = (ids: string[]) => {
		// Filet de sécurité côté client : tronque à la cap si jamais une race condition
		// laissait passer une N+1ᵉ sélection.
		const capped = ids.length > maxSelected ? ids.slice(0, maxSelected) : ids;
		onValueChange(capped);
	};

	return (
		<div className="space-y-2">
			{showLabel && (
				<FieldLabel htmlFor={fieldName} optional>
					{label}
				</FieldLabel>
			)}
			<div className="flex gap-2">
				<div className="flex-1">
					<MultiSelect
						id={fieldName}
						options={mappedOptions}
						value={value}
						onValueChange={handleValueChange}
						placeholder="Sélectionner un ou plusieurs matériaux"
					/>
				</div>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
					onClick={() => {
						haptic("light");
						materialDialog.open({
							onCreated: (id: string) => {
								// Ajoute le nouveau matériau à la sélection (en fin = priorité plus basse)
								// sauf si on est déjà au cap.
								if (value.length < maxSelected) {
									onValueChange([...value, id]);
								}
								router.refresh();
							},
						});
					}}
					aria-label="Créer un nouveau matériau"
					disabled={isAtCap}
				>
					<PlusIcon className="size-4" aria-hidden="true" />
				</Button>
			</div>
			<p className="text-muted-foreground flex items-start gap-1 text-xs">
				<InfoIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
				<span>
					{value.length}/{maxSelected} — le premier matériau est le principal (utilisé pour les
					conseils d'entretien et la fiche produit).
				</span>
			</p>
		</div>
	);
}
