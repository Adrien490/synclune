"use client";

import Image from "next/image";

import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { formatEuro } from "@/shared/utils/format-euro";
import { cn } from "@/shared/utils/cn";

import type { ActiveSku, ImageSelection, StockDescription, StockTone } from "./sku-selector-utils";

/**
 * Point de stock. ⚠️ Il est REDONDANT avec le libellé, jamais porteur seul :
 * `--warning` en texte donne 2,19:1 sur `--background`. La doctrine du dépôt
 * (`cart-state-chip.tsx`) veut que le mot porte l'information et la couleur
 * l'accompagne.
 */
const PIP_CLASSES: Record<StockTone, string> = {
	available: "bg-success",
	low: "bg-warning",
	maxed: "bg-warning",
	"sold-out": "bg-muted-foreground/40",
};

export interface SkuSelectorPieceRowProps {
	sku: ActiveSku;
	label: { text: string; size: string | null };
	image: ImageSelection;
	stock: StockDescription;
	isSelected: boolean;
	onSelect: () => void;
	onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Une ligne = une pièce réelle (un SKU), pas un attribut.
 *
 * Deux invariants qui ne se devinent pas au JSX :
 *
 * 1. **L'anneau d'état vit sur le `<span>` intérieur, pas sur le bouton.**
 *    `@utility focus-ring` pose `focus-visible:ring-[5px] ring-ring` — un `ring-1`
 *    / `ring-2` d'état sur le même élément serait écrasé au focus clavier. Le bouton
 *    porte donc le focus (outline `--foreground`, 19,54:1, + halo rose de marque),
 *    le span porte la sélection. Même parade que `color-selector.tsx`.
 *
 * 2. **`aria-disabled`, jamais `disabled`.** Un `<button disabled>` sort de l'ordre
 *    de tabulation et `focusOption` l'exclut de sa requête ; c'est ce qui faisait
 *    sortir tout le radiogroup du tab order dès que la sélection devenait
 *    indisponible. Ici le focus traverse les pièces épuisées pour qu'elles soient
 *    annoncées (WCAG 1.3.1) — seul le clic est un no-op.
 */
export function SkuSelectorPieceRow({
	sku,
	label,
	image,
	stock,
	isSelected,
	onSelect,
	onKeyDown,
}: SkuSelectorPieceRowProps) {
	const isSoldOut = stock.tone === "sold-out";
	const fullLabel = [label.text, label.size].filter(Boolean).join(" · ");

	return (
		<button
			type="button"
			role="radio"
			aria-checked={isSelected}
			aria-disabled={isSoldOut || undefined}
			data-option-id={sku.id}
			aria-label={`${fullLabel}, ${formatEuro(sku.priceInclTax)}, ${stock.label}`}
			onClick={() => {
				if (isSoldOut) return;
				onSelect();
			}}
			onKeyDown={onKeyDown}
			className={cn(
				"focus-ring group relative block w-full rounded-md text-left",
				"aria-disabled:cursor-not-allowed",
			)}
		>
			<span
				className={cn(
					"bg-card flex items-center gap-3.5 rounded-md p-2.5",
					"motion-safe:transition-shadow motion-safe:duration-200 motion-safe:ease-[var(--ease-spring)]",
					"group-aria-disabled:opacity-55 group-aria-disabled:saturate-50",
					isSelected
						? "ring-foreground ring-2"
						: "ring-foreground/15 can-hover:group-hover:ring-foreground/40 group-focus-visible:ring-foreground/40 ring-1",
				)}
			>
				<span className="bg-muted relative size-15 shrink-0 overflow-hidden rounded-[var(--radius)]">
					<Image
						src={image.url}
						alt=""
						fill
						className="object-cover"
						placeholder={image.blurDataUrl ? "blur" : "empty"}
						blurDataURL={image.blurDataUrl ?? undefined}
						sizes="60px"
						quality={IMAGE_QUALITY.THUMBNAIL}
					/>
				</span>

				<span className="min-w-0 flex-1" aria-hidden="true">
					<span className="block truncate text-sm leading-tight font-semibold">
						{label.text}
						{label.size && (
							<span className="text-muted-foreground font-normal">
								{label.text ? " · " : ""}
								{label.size}
							</span>
						)}
					</span>
					<span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
						<span
							className={cn("size-1.5 shrink-0 rounded-full", PIP_CLASSES[stock.tone])}
							aria-hidden="true"
						/>
						<span className="truncate">{stock.label}</span>
					</span>
				</span>

				<span className="shrink-0 text-base font-semibold tabular-nums" aria-hidden="true">
					{formatEuro(sku.priceInclTax)}
				</span>
			</span>
		</button>
	);
}
