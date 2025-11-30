"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useOptimistic, useRef, useTransition } from "react";

interface UseGalleryNavigationOptions {
	totalImages: number;
}

export interface UseGalleryNavigationReturn {
	selectedIndex: number;
	optimisticIndex: number;
	isPending: boolean;
	navigateToIndex: (index: number) => void;
	navigateNext: () => void;
	navigatePrev: () => void;
	updateUrl: (index: number) => void;
}

/**
 * Hook pour gérer la navigation dans la galerie d'images
 * - Synchronisation avec l'URL (param "gallery")
 * - Navigation optimiste pour une UX fluide
 * - Fonctions next/prev avec boucle circulaire
 */
export function useGalleryNavigation({
	totalImages,
}: UseGalleryNavigationOptions): UseGalleryNavigationReturn {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Ref pour stabiliser searchParams et éviter recréation des callbacks
	// Assignation directe dans le render (pas besoin de useEffect)
	const searchParamsRef = useRef(searchParams);
	searchParamsRef.current = searchParams;

	// Source de vérité : l'URL (avec validation NaN)
	const rawGalleryParam = searchParams.get("gallery");
	const parsedIndex = rawGalleryParam ? parseInt(rawGalleryParam, 10) : 0;
	const selectedIndex = totalImages > 0
		? Math.max(0, Math.min(totalImages - 1, Number.isNaN(parsedIndex) ? 0 : parsedIndex))
		: 0;

	// État optimiste pour navigation fluide
	const [optimisticIndex, setOptimisticIndex] = useOptimistic(
		selectedIndex,
		(_, newIndex: number) => newIndex
	);

	// Mise à jour de l'URL (dépendances stabilisées via ref)
	const updateUrl = useCallback(
		(newIndex: number) => {
			const newSearchParams = new URLSearchParams(searchParamsRef.current);

			if (newIndex === 0) {
				newSearchParams.delete("gallery");
			} else {
				newSearchParams.set("gallery", newIndex.toString());
			}

			const newUrl = `${pathname}${
				newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""
			}`;
			router.replace(newUrl, { scroll: false });
		},
		[pathname, router]
	);

	// Navigation optimiste vers un index spécifique
	const navigateToIndex = useCallback(
		(newIndex: number) => {
			if (newIndex < 0 || newIndex >= totalImages) return;

			startTransition(() => {
				setOptimisticIndex(newIndex);
				updateUrl(newIndex);
			});
		},
		[totalImages, startTransition, updateUrl, setOptimisticIndex]
	);

	// Navigation suivante (circulaire)
	const navigateNext = useCallback(() => {
		if (totalImages === 0) return;
		const nextIndex = (optimisticIndex + 1) % totalImages;
		navigateToIndex(nextIndex);
	}, [optimisticIndex, totalImages, navigateToIndex]);

	// Navigation précédente (circulaire)
	const navigatePrev = useCallback(() => {
		if (totalImages === 0) return;
		const prevIndex =
			optimisticIndex === 0 ? totalImages - 1 : optimisticIndex - 1;
		navigateToIndex(prevIndex);
	}, [optimisticIndex, totalImages, navigateToIndex]);

	return {
		selectedIndex,
		optimisticIndex,
		isPending,
		navigateToIndex,
		navigateNext,
		navigatePrev,
		updateUrl,
	};
}
