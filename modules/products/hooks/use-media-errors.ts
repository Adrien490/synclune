"use client";

import { useCallback, useState } from "react";

export interface UseMediaErrorsReturn {
	mediaErrors: Set<string>;
	handleMediaError: (mediaId: string) => void;
	hasError: (mediaId: string) => boolean;
	clearErrors: () => void;
}

/**
 * Hook pour gérer les erreurs de chargement des médias (images/vidéos)
 * - Track les médias qui ont échoué au chargement
 * - Fonction helper pour vérifier si un média a une erreur
 * - Possibilité de réinitialiser les erreurs
 */
export function useMediaErrors(): UseMediaErrorsReturn {
	const [mediaErrors, setMediaErrors] = useState<Set<string>>(new Set());

	const handleMediaError = useCallback((mediaId: string) => {
		setMediaErrors((prev) => new Set(prev).add(mediaId));
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

	return {
		mediaErrors,
		handleMediaError,
		hasError,
		clearErrors,
	};
}
