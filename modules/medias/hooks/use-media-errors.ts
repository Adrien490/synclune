"use client";

import { useCallback, useState } from "react";

/** Limite pour éviter les memory leaks avec beaucoup d'erreurs */
const MAX_ERRORS = 100;

export interface UseMediaErrorsReturn {
	mediaErrors: Set<string>;
	handleMediaError: (mediaId: string) => void;
	hasError: (mediaId: string) => boolean;
	clearErrors: () => void;
	/** Retry: supprime l'erreur d'un média spécifique pour permettre un rechargement */
	retryMedia: (mediaId: string) => void;
}

/**
 * Hook pour gérer les erreurs de chargement des médias (images/vidéos)
 * - Track les médias qui ont échoué au chargement
 * - Fonction helper pour vérifier si un média a une erreur
 * - Possibilité de réinitialiser toutes les erreurs ou une seule (retry)
 * - Limite à MAX_ERRORS pour éviter les memory leaks
 */
export function useMediaErrors(): UseMediaErrorsReturn {
	const [mediaErrors, setMediaErrors] = useState<Set<string>>(new Set());

	const handleMediaError = useCallback((mediaId: string) => {
		setMediaErrors((prev) => {
			// Prévention memory leak : ne pas dépasser MAX_ERRORS
			if (prev.size >= MAX_ERRORS) return prev;
			return new Set(prev).add(mediaId);
		});
	}, []);

	const hasError = useCallback(
		(mediaId: string) => {
			return mediaErrors.has(mediaId);
		},
		[mediaErrors]
	);

	const clearErrors = useCallback(() => {
		setMediaErrors(new Set());
	}, []);

	const retryMedia = useCallback((mediaId: string) => {
		setMediaErrors((prev) => {
			if (!prev.has(mediaId)) return prev;
			const next = new Set(prev);
			next.delete(mediaId);
			return next;
		});
	}, []);

	return {
		mediaErrors,
		handleMediaError,
		hasError,
		clearErrors,
		retryMedia,
	};
}
