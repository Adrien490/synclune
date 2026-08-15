"use client";

import { InfoIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import { COLOR_DIALOG_ID } from "@/modules/colors/components/color-form-dialog";
import { SortableColorChips } from "@/modules/colors/components/admin/sortable-color-chips";
import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { FieldLabel } from "@/shared/components/forms";
import { MultiSelect } from "@/shared/components/multi-select/multi-select";
import { Button } from "@/shared/components/ui/button";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/overlay-store-provider";

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
	/** Cap dur sur le nombre de couleurs. Défaut: ARRAY_LIMITS.VARIANT_COLORS. */
	maxSelected?: number;
	/** ID du champ (utilisé pour l'aria/label). */
	fieldName?: string;
}

/**
 * Champ multi-select pour les couleurs d'un VARIANT.
 *
 * Convention métier : l'ordre du tableau reflète la priorité d'affichage,
 * la 1re couleur est la couleur « principale » utilisée pour la vignette
 * listing/PDP et le snapshot facture (joint dans l'ordre).
 *
 * - Cap à `ARRAY_LIMITS.VARIANT_COLORS` (3) par défaut.
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
	maxSelected = ARRAY_LIMITS.VARIANT_COLORS,
	fieldName,
}: ColorMultiSelectFieldProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const colorDialog = useDialog(COLOR_DIALOG_ID);

	// Filet de sécurité : TanStack Form peut transmettre `undefined` en mount initial
	// si le defaultValue n'a pas encore été hydraté côté formulaire. On normalise.
	const safeValue = Array.isArray(value) ? value : [];
	const isAtCap = safeValue.length >= maxSelected;
	// `Set` hoisté : sinon un `.includes()` par option rescanne toute la sélection.
	const selectedIds = new Set(safeValue);

	// Préfixe pastille hex inline ; ring de contraste si la couleur est très claire
	// (sinon invisible sur fond blanc du select). Au cap : grise les options non
	// sélectionnées plutôt que de les retirer (UX cohérence avec matériaux).
	const mappedOptions = options.map((c) => ({
		value: c.id,
		label: c.name,
		disabled: isAtCap && !selectedIds.has(c.id),
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

	// Chips réordonnables : on hydrate les ids sélectionnés depuis options pour
	// retrouver name+hex. Si une couleur a été archivée entre-temps, on la skip.
	const selectedChips = safeValue
		.map((id) => options.find((o) => o.id === id))
		.filter((c): c is ColorOptionItem => c !== undefined)
		.map((c) => ({ id: c.id, name: c.name, hex: c.hex }));

	const handleReorder = (next: { id: string }[]) => {
		onValueChange(next.map((c) => c.id));
	};

	const handleRemove = (id: string) => {
		onValueChange(safeValue.filter((v) => v !== id));
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
						value={safeValue}
						onValueChange={handleValueChange}
						placeholder="Pose tes premières teintes"
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
								if (safeValue.length < maxSelected) {
									onValueChange([...safeValue, id]);
								}
								router.refresh();
							},
						});
					}}
					aria-label="Créer une nouvelle couleur"
					disabled={isAtCap}
				>
					<PlusIcon className="size-4" aria-hidden="true" />
				</Button>
			</div>
			<SortableColorChips chips={selectedChips} onReorder={handleReorder} onRemove={handleRemove} />
			<p className="text-muted-foreground flex items-start gap-1 text-xs">
				<InfoIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
				<span>
					{safeValue.length}/{maxSelected} — la première teinte est la principale (vignette boutique
					et facture).
				</span>
			</p>
			{isAtCap && (
				<p className="text-muted-foreground/80 pl-4 text-xs italic" role="status">
					Désélectionne une teinte pour libérer une place dans la palette.
				</p>
			)}
		</div>
	);
}
