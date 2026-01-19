"use client";

import { Sparkles } from "lucide-react";

// Durée en ms pour considérer une collection comme "nouvelle" (30 jours)
const NEW_COLLECTION_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

interface NewCollectionBadgeProps {
	createdAt: Date;
}

/**
 * Badge "Nouvelle" pour les collections récentes
 * Client component car utilise Date.now() qui n'est pas disponible en SSR
 */
export function NewCollectionBadge({ createdAt }: NewCollectionBadgeProps) {
	const isNew = Date.now() - new Date(createdAt).getTime() < NEW_COLLECTION_THRESHOLD_MS;

	if (!isNew) return null;

	return (
		<div
			className="absolute -top-2 -right-2 z-10 px-2 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full shadow-md flex items-center gap-1"
			aria-label="Nouvelle collection"
		>
			<Sparkles className="w-3 h-3" aria-hidden="true" />
			<span>Nouvelle</span>
		</div>
	);
}
