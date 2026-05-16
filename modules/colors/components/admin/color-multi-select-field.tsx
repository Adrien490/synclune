"use client";

import { Info, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { COLOR_DIALOG_ID } from "@/modules/colors/components/color-form-dialog";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { FieldLabel } from "@/shared/components/forms";
import { MultiSelect } from "@/shared/components/multi-select/multi-select";
import { Button } from "@/shared/components/ui/button";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";

export interface ColorOptionItem {
	id: string;
	name: string;
	hex: string;
}

interface ColorMultiSelectFieldProps {
	/** Ids actuellement sélectionnés (ordre = priorité, 1er = principal). */
	value: string[];
	/** Callback de mise à jour. L'ordre du tableau doit être préservé par l'appelant. */
	onValueChange: (ids: string[]) => void;
	/** Liste complète des couleurs actives (récupérée via getColorOptions). */
	options: ColorOptionItem[];
	/** Affiche le label/aide. Défaut: true. */
	showLabel?: boolean;
	/** Libellé du label affiché. Défaut: "Couleurs". */
	label?: string;
	/** Cap dur sur le nombre de couleurs. Défaut: ARRAY_LIMITS.SKU_COLORS. */
	maxSelected?: number;
	/** ID du champ (utilisé pour l'aria/label). */
	fieldName?: string;
}

/**
 * Champ multi-select pour les couleurs d'un SKU.
 *
 * Convention métier : l'ordre du tableau reflète la priorité d'affichage,
 * la 1re couleur est la couleur « principale » utilisée pour la vignette
 * listing/PDP et le snapshot facture (joint dans l'ordre).
 *
 * - Cap à `ARRAY_LIMITS.SKU_COLORS` (3) par défaut.
 * - Bouton « Créer une couleur » inline qui ouvre le dialog partagé.
 * - Aide visuelle indiquant la convention « 1re = principale ».
 * - Chaque option est préfixée d'une pastille hex inline pour repérage rapide.
 */
export function ColorMultiSelectField({
	value,
	onValueChange,
	options,
	showLabel = true,
	label = "Couleurs",
	maxSelected = ARRAY_LIMITS.SKU_COLORS,
	fieldName,
}: ColorMultiSelectFieldProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const colorDialog = useDialog(COLOR_DIALOG_ID);

	const isAtCap = value.length >= maxSelected;

	// Préfixe pastille hex inline ; ring de contraste si la couleur est très claire
	// (sinon invisible sur fond blanc du select). Au cap : grise les options non
	// sélectionnées plutôt que de les retirer (UX cohérence avec matériaux).
	const mappedOptions = options.map((c) => ({
		value: c.id,
		label: c.name,
		disabled: isAtCap && !value.includes(c.id),
		prefix: (
			<span
				aria-hidden="true"
				className={
					isLightColor(c.hex, 0.85)
						? "ring-border/30 inline-block size-3 shrink-0 rounded-full ring-1"
						: "inline-block size-3 shrink-0 rounded-full"
				}
				style={{ backgroundColor: c.hex }}
			/>
		),
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
						placeholder="Sélectionner une ou plusieurs couleurs"
					/>
				</div>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="min-h-11 min-w-11 shrink-0 sm:min-h-9 sm:min-w-9"
					onClick={() => {
						haptic("light");
						colorDialog.open({
							onCreated: (id: string) => {
								// Ajoute la nouvelle couleur à la sélection (en fin = priorité plus basse)
								// sauf si on est déjà au cap.
								if (value.length < maxSelected) {
									onValueChange([...value, id]);
								}
								router.refresh();
							},
						});
					}}
					aria-label="Créer une nouvelle couleur"
					disabled={isAtCap}
				>
					<Plus className="size-4" aria-hidden="true" />
				</Button>
			</div>
			<p className="text-muted-foreground flex items-start gap-1 text-xs">
				<Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
				<span>
					{value.length}/{maxSelected} — la première teinte est la principale (vignette boutique et
					facture).
				</span>
			</p>
		</div>
	);
}
