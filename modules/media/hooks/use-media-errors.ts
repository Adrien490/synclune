"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Limite pour eviter les memory leaks avec beaucoup d'erreurs */
const MAX_ERRORS = 500;
/** Nombre maximum de tentatives de retry par media */
const MAX_RETRIES = 3;
/** Delai de base pour le backoff exponentiel (1s, 2s, 4s) */
const BACKOFF_BASE_MS = 1000;

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
	/** Vérifie si un média a atteint le nombre max de retries */
	isMaxRetriesReached: (mediaId: string) => boolean;
	/** Nombre de retries effectués pour un média */
	getRetryCount: (mediaId: string) => number;
}

/**
 * Hook pour gérer les erreurs de chargement des médias (images/vidéos)
 * - Track les médias qui ont échoué au chargement
 * - Fonction helper pour vérifier si un média a une erreur
 * - Possibilité de réinitialiser toutes les erreurs ou une seule (retry)
 * - Rotation FIFO à MAX_ERRORS pour éviter les memory leaks
 * - Backoff exponentiel pour les retries (1s, 2s, 4s)
 * - Maximum 3 tentatives par média
 */
export function useMediaErrors(): UseMediaErrorsReturn {
	// Utilise Map pour garder l'ordre d'insertion (FIFO)
	const [mediaErrors, setMediaErrors] = useState<Set<string>>(new Set());

	// File FIFO pour l'ordre d'insertion (Set ne garantit pas l'ordre dans tous les cas)
	const errorQueueRef = useRef<string[]>([]);

	// Compteur de retries par media
	const retryCountRef = useRef<Map<string, number>>(new Map());

	// Timeouts en cours pour debounce des retries
	const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

	// Ref pour stabiliser hasError et éviter re-renders en cascade
	// Assignation directe dans le render (pas besoin de useEffect)
	const mediaErrorsRef = useRef(mediaErrors);
	mediaErrorsRef.current = mediaErrors;

	const handleMediaError = (mediaId: string) => {
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
	};

	// Fonction stable qui lit la ref courante (évite re-renders des composants utilisant hasError)
	const hasError = (mediaId: string) => {
		return mediaErrorsRef.current.has(mediaId);
	};

	const clearErrors = () => {
		setMediaErrors(new Set());
		errorQueueRef.current = [];
	};

	const retryMedia = (mediaId: string) => {
		// Debounce: annuler un retry en cours pour le meme media
		const existingTimeout = retryTimeoutsRef.current.get(mediaId);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
			retryTimeoutsRef.current.delete(mediaId);
		}

		const currentCount = retryCountRef.current.get(mediaId) || 0;

		// Verifier si le nombre max de retries est atteint
		if (currentCount >= MAX_RETRIES) {
			toast.error("Impossible de charger ce media apres plusieurs tentatives");
			return;
		}

		// Incrementer le compteur de retries
		retryCountRef.current.set(mediaId, currentCount + 1);

		// Calculer le delai avec backoff exponentiel (1s, 2s, 4s)
		const delay = BACKOFF_BASE_MS * Math.pow(2, currentCount);

		// Afficher un toast de chargement
		const toastId = toast.loading(
			`Nouvelle tentative dans ${delay / 1000}s...`,
			{ duration: delay }
		);

		// Supprimer l'erreur apres le delai pour permettre un rechargement
		const timeout = setTimeout(() => {
			toast.dismiss(toastId);
			retryTimeoutsRef.current.delete(mediaId);

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
		}, delay);

		retryTimeoutsRef.current.set(mediaId, timeout);
	};

	// Cleanup des timeouts au unmount
	useEffect(() => {
		return () => {
			retryTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
			retryTimeoutsRef.current.clear();
		};
	}, []);

	const isMaxRetriesReached = (mediaId: string) => {
		return (retryCountRef.current.get(mediaId) || 0) >= MAX_RETRIES;
	};

	const getRetryCount = (mediaId: string) => {
		return retryCountRef.current.get(mediaId) || 0;
	};

	return {
		mediaErrors,
		handleMediaError,
		hasError,
		clearErrors,
		retryMedia,
		isMaxErrorsReached: mediaErrors.size >= MAX_ERRORS,
		errorCount: mediaErrors.size,
		isMaxRetriesReached,
		getRetryCount,
	};
}
