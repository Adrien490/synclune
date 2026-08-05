"use client";

import { useTransition, type ReactElement } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { PRODUCTS_SORT_OPTIONS } from "@/modules/products/constants/product.constants";
import type { SortOption } from "@/shared/types/sort.types";

const DEFAULT_SORT = PRODUCTS_SORT_OPTIONS.CREATED_DESC;

interface ProductSortMenuProps {
	/** Options de tri, dans l'ordre d'affichage (SSOT `PRODUCTS_SORT_OPTIONS`). */
	options: SortOption[];
	/** Le déclencheur (une étiquette `ShelfBarButton`), passé au `render` de Base UI. */
	children: ReactElement;
}

/**
 * Le tri desktop en menu ancré — « Le bon meuble » (audit /produits 2026-08-05,
 * direction B, lot 1).
 *
 * @description
 * À `lg`, « Trier » ouvrait le même `SortDrawer` que le mobile : un tiroir bas
 * pleine largeur avec poignée de drag et scrim sur toute la page — sept options
 * étalées sur 1 280 px pour un geste de souris. Le meuble disait « téléphone »
 * sur la seule vue où la boutique dit « bureau ». Ce menu est posé sous son
 * bouton (240 px), la page reste lisible derrière ; le tiroir reste le meuble
 * du mobile (déclencheur `lg:hidden` dans `ProductSortBar`, celui-ci vit dans
 * le cluster de la rangée titre, `CatalogToolbarInline`, `hidden lg:flex`).
 *
 * Deux choix qui ne se devinent pas :
 * - **« Plus récents » et l'URL nue sont la même ligne.** Le tiroir mobile a une
 *   entrée « Par défaut » distincte dont « Plus récents » est le doublon anonyme
 *   (défaut relevé par l'audit). Ici les deux états sont fusionnés : la ligne
 *   par défaut est cochée pour `?sortBy=created-descending` COMME pour l'URL
 *   nue, et la choisir efface le paramètre au lieu d'écrire la valeur par défaut.
 * - **Pas de `page=1`, curseur seulement** — même règle que le tiroir depuis le
 *   retrait du paramètre fantôme (il faisait basculer la page en `noindex`).
 */
export function ProductSortMenu({ options, children }: ProductSortMenuProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();

	const current = searchParams.get("sortBy") ?? "";
	const normalized = current === "" ? DEFAULT_SORT : current;

	const handleValueChange = (value: unknown) => {
		if (typeof value !== "string" || value === normalized) return;

		const params = new URLSearchParams(searchParams.toString());
		if (value === DEFAULT_SORT) {
			params.delete("sortBy");
		} else {
			params.set("sortBy", value);
		}
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	// Les tris « métier » (récence, prix) d'un côté, l'alphabétique de l'autre :
	// le séparateur dit que ce dernier est un outil d'inventaire, pas un choix
	// de visite.
	const primary = options.filter((option) => !option.value.startsWith("title-"));
	const alphabetical = options.filter((option) => option.value.startsWith("title-"));

	const renderItem = (option: SortOption) => (
		<DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
			{option.label}
			{option.value === DEFAULT_SORT && (
				<span className="text-muted-foreground ml-auto text-xs">par défaut</span>
			)}
		</DropdownMenuRadioItem>
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={children} />
			<DropdownMenuContent align="end" className="min-w-60">
				<DropdownMenuRadioGroup value={normalized} onValueChange={handleValueChange}>
					{primary.map(renderItem)}
					{primary.length > 0 && alphabetical.length > 0 && <DropdownMenuSeparator />}
					{alphabetical.map(renderItem)}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
