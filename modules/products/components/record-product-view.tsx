"use client";

import { useEffect, useRef } from "react";
import { posthogEvents } from "@/shared/lib/posthog-events";
import { addRecentProduct } from "../actions/add-recent-product";

interface RecordProductViewProps {
	slug: string;
	productId: string;
	productName: string;
	price: number;
	collection?: string;
}

/**
 * Composant invisible qui enregistre une vue produit
 * et envoie un evenement PostHog product_viewed.
 */
export function RecordProductView({
	slug,
	productId,
	productName,
	price,
	collection,
}: RecordProductViewProps) {
	const hasRecorded = useRef(false);

	useEffect(() => {
		if (hasRecorded.current) return;
		hasRecorded.current = true;

		// Enregistrer la vue via server action
		const formData = new FormData();
		formData.set("slug", slug);
		void addRecentProduct(undefined, formData);

		// Track in PostHog
		posthogEvents.productViewed({
			id: productId,
			name: productName,
			price,
			collection,
		});
	}, [slug, productId, productName, price, collection]);

	return null;
}
