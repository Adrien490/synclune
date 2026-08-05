"use client";

import { DragDropProvider, KeyboardSensor, PointerSensor, type DragEndEvent } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { RestrictToWindow } from "@dnd-kit/dom/modifiers";
import { arrayMove } from "@dnd-kit/helpers";
import { DotsSixVerticalIcon, StarIcon, XIcon } from "@phosphor-icons/react/ssr";

import { isLightColor } from "@/modules/colors/utils/color-contrast.utils";
import { Badge } from "@/shared/components/ui/badge";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { cn } from "@/shared/utils/cn";

interface SortableColorChip {
	id: string;
	name: string;
	hex: string;
}

interface SortableColorChipsProps {
	/** Couleurs sélectionnées dans l'ordre courant (1ʳᵉ = principale). */
	chips: SortableColorChip[];
	/** Émis avec le nouvel ordre après drag-end. */
	onReorder: (next: SortableColorChip[]) => void;
	/** Émis quand l'utilisateur retire une teinte de la palette. */
	onRemove: (id: string) => void;
}

/**
 * Palette réordonnable des couleurs sélectionnées (M2M).
 *
 * - Drag-to-reorder via @dnd-kit (parité visuelle avec medias) — touch = long-press 250ms,
 *   desktop = distance 8px, clavier = Space pour saisir/déposer + flèches.
 * - L'ordre matérialise la priorité métier : la 1ʳᵉ teinte habille la vignette
 *   boutique et la facture (snapshot order `skuColor`).
 * - Bouton « X » sur chaque chip pour retirer la teinte sans rouvrir le MultiSelect.
 */
export function SortableColorChips({ chips, onReorder, onRemove }: SortableColorChipsProps) {
	const haptic = useHaptic();
	const isTouchDevice = useIsTouchDevice();

	if (chips.length < 2) return null;

	const handleDragEnd = (event: DragEndEvent) => {
		const { source, target } = event.operation;
		if (!source || !target || source.id === target.id) return;
		const sourceIndex = chips.findIndex((c) => c.id === source.id);
		const targetIndex = chips.findIndex((c) => c.id === target.id);
		if (sourceIndex < 0 || targetIndex < 0) return;
		haptic("selection");
		onReorder(arrayMove(chips, sourceIndex, targetIndex));
	};

	return (
		<DragDropProvider
			sensors={[
				PointerSensor.configure({
					activationConstraints: isTouchDevice
						? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 8 })]
						: [new PointerActivationConstraints.Distance({ value: 8 })],
				}),
				KeyboardSensor,
			]}
			modifiers={[RestrictToWindow]}
			onDragEnd={handleDragEnd}
		>
			<span id="color-chips-drag-instructions" className="sr-only">
				Utilisez Espace ou Entrée pour saisir une teinte, les flèches pour la déplacer, Espace ou
				Entrée pour déposer, Échap pour annuler.
			</span>
			<ul
				className="flex flex-wrap gap-1.5"
				aria-label="Palette ordonnée — la première teinte est la principale"
				aria-describedby="color-chips-drag-instructions"
			>
				{chips.map((chip, index) => (
					<SortableColorChipItem
						key={chip.id}
						chip={chip}
						index={index}
						isPrimary={index === 0}
						onRemove={() => onRemove(chip.id)}
					/>
				))}
			</ul>
		</DragDropProvider>
	);
}

interface SortableColorChipItemProps {
	chip: SortableColorChip;
	index: number;
	isPrimary: boolean;
	onRemove: () => void;
}

function SortableColorChipItem({ chip, index, isPrimary, onRemove }: SortableColorChipItemProps) {
	const haptic = useHaptic();
	const { ref, isDragSource } = useSortable({
		id: chip.id,
		index,
	});

	const handleRemove = (event: React.MouseEvent | React.KeyboardEvent) => {
		event.stopPropagation();
		haptic("light");
		onRemove();
	};

	return (
		<li
			ref={ref as unknown as React.Ref<HTMLLIElement>}
			className={cn(
				"bg-background flex min-h-9 items-center gap-2 rounded-full border py-1 pr-1 pl-2 text-sm shadow-sm select-none",
				"motion-safe:transition-shadow motion-safe:active:scale-[0.98]",
				isDragSource && "ring-primary/40 cursor-grabbing opacity-80 ring-2",
				!isDragSource && "cursor-grab",
			)}
			aria-label={`${chip.name}${isPrimary ? ", couleur principale" : ""}, position ${index + 1}`}
		>
			<DotsSixVerticalIcon
				className="text-muted-foreground/70 size-3.5 shrink-0"
				aria-hidden="true"
			/>
			<span
				className={cn(
					"size-4 shrink-0 rounded-full",
					isLightColor(chip.hex, 0.85) && "ring-border/40 ring-1",
				)}
				style={{ backgroundColor: chip.hex }}
				aria-hidden="true"
			/>
			<span className="max-w-[10rem] truncate">{chip.name}</span>
			{isPrimary && (
				<Badge variant="secondary" className="text-2xs gap-1 px-1.5 py-0 font-medium">
					<StarIcon className="size-2.5" weight="fill" aria-hidden="true" />
					Principale
				</Badge>
			)}
			<button
				type="button"
				onClick={handleRemove}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleRemove(e);
					}
				}}
				className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring inline-flex size-6 items-center justify-center rounded-full transition-colors"
				aria-label={`Retirer ${chip.name} de la palette`}
			>
				<XIcon className="size-3" aria-hidden="true" />
			</button>
		</li>
	);
}
