"use client";

import { useCallback, useRef, useState } from "react";

/** Limite pour éviter les memory leaks avec beaucoup d'erreurs */
const MAX_ERRORS = 500;

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

	// Ref pour stabiliser hasError et éviter re-renders en cascade
	// Assignation directe dans le render (pas besoin de useEffect)
	const mediaErrorsRef = useRef(mediaErrors);
	mediaErrorsRef.current = mediaErrors;

	const handleMediaError = useCallback((mediaId: string) => {
		setMediaErrors((prev) => {
			// Prévention memory leak : ne pas dépasser MAX_ERRORS
			if (prev.size >= MAX_ERRORS) {
				console.warn(`[MediaErrors] Limite de ${MAX_ERRORS} erreurs atteinte`);
				return prev;
			}
			return new Set(prev).add(mediaId);
		});
	}, []);

	// Fonction stable qui lit la ref courante (évite re-renders des composants utilisant hasError)
	const hasError = useCallback((mediaId: string) => {
		return mediaErrorsRef.current.has(mediaId);
	}, []);

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
