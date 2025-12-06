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
	/** Indique si la limite MAX_ERRORS a été atteinte */
	isMaxErrorsReached: boolean;
	/** Nombre d'erreurs actuellement trackées */
	errorCount: number;
}

/**
 * Hook pour gérer les erreurs de chargement des médias (images/vidéos)
 * - Track les médias qui ont échoué au chargement
 * - Fonction helper pour vérifier si un média a une erreur
 * - Possibilité de réinitialiser toutes les erreurs ou une seule (retry)
 * - Rotation FIFO à MAX_ERRORS pour éviter les memory leaks
 */
export function useMediaErrors(): UseMediaErrorsReturn {
	// Utilise Map pour garder l'ordre d'insertion (FIFO)
	const [mediaErrors, setMediaErrors] = useState<Set<string>>(new Set());

	// File FIFO pour l'ordre d'insertion (Set ne garantit pas l'ordre dans tous les cas)
	const errorQueueRef = useRef<string[]>([]);

	// Ref pour stabiliser hasError et éviter re-renders en cascade
	// Assignation directe dans le render (pas besoin de useEffect)
	const mediaErrorsRef = useRef(mediaErrors);
	mediaErrorsRef.current = mediaErrors;

	const handleMediaError = useCallback((mediaId: string) => {
		setMediaErrors((prev) => {
			// Éviter les doublons
			if (prev.has(mediaId)) return prev;

			const next = new Set(prev);

			// Rotation FIFO: supprimer le plus ancien si limite atteinte
			if (next.size >= MAX_ERRORS) {
				const oldest = errorQueueRef.current.shift();
				if (oldest) {
					next.delete(oldest);
				}
				console.warn(`[MediaErrors] Limite de ${MAX_ERRORS} erreurs - rotation FIFO`);
			}

			// Ajouter le nouveau
			next.add(mediaId);
			errorQueueRef.current.push(mediaId);

			return next;
		});
	}, []);

	// Fonction stable qui lit la ref courante (évite re-renders des composants utilisant hasError)
	const hasError = useCallback((mediaId: string) => {
		return mediaErrorsRef.current.has(mediaId);
	}, []);

	const clearErrors = useCallback(() => {
		setMediaErrors(new Set());
		errorQueueRef.current = [];
	}, []);

	const retryMedia = useCallback((mediaId: string) => {
		setMediaErrors((prev) => {
			if (!prev.has(mediaId)) return prev;
			const next = new Set(prev);
			next.delete(mediaId);
			// Supprimer aussi de la file FIFO
			const queueIndex = errorQueueRef.current.indexOf(mediaId);
			if (queueIndex !== -1) {
				errorQueueRef.current.splice(queueIndex, 1);
			}
			return next;
		});
	}, []);

	return {
		mediaErrors,
		handleMediaError,
		hasError,
		clearErrors,
		retryMedia,
		isMaxErrorsReached: mediaErrors.size >= MAX_ERRORS,
		errorCount: mediaErrors.size,
	};
}
