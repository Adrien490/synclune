import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import type { MediaType } from "@/app/generated/prisma/client";

export interface MediaArrayFieldValue {
	url: string;
	type: MediaType;
	alt?: string;
	/** Poster vidéo — transitoire (session formulaire), jamais persisté. */
	thumbnailUrl?: string | null;
	/**
	 * Placeholder blur — PERSISTÉ (`ProductMedia.blurDataUrl`) : chaque remap
	 * doit le porter, les actions font deleteMany + recréation.
	 */
	blurDataUrl?: string;
}

/**
 * Type strict pour les champs `form.Field` de TanStack Form attachés à un
 * tableau de médias (création + édition produit + VARIANT). Étend `MediaField`
 * en exposant `state.value` typé et `removeValue` pour la suppression.
 *
 * Partagé entre create-product-media-card et edit-product-media-card pour
 * éviter la duplication de la définition locale.
 */
export type MediaArrayField = MediaField & {
	state: {
		value: MediaArrayFieldValue[];
		meta: { errors: unknown[] };
	};
	removeValue: (index: number) => void;
};

/**
 * Helpers de cast centralisés.
 *
 * Les types `FieldApi` générés par TanStack Form sont trop larges pour notre
 * usage ciblé (tableau de médias). Plutôt que de répéter le double cast
 * `field as unknown as MediaArrayField` dans chaque consumer, on l'isole ici
 * — un seul point d'entrée à mettre à jour si la signature de TanStack
 * évolue.
 */
export function asMediaArrayField(field: unknown): MediaArrayField {
	return field as MediaArrayField;
}

/**
 * Variante pour les contextes qui ne consomment que `state.value` + `pushValue`
 * (par exemple `onFilesDropped` qui délègue à `useMediaFieldUpload`).
 */
export function asMediaField(field: unknown): MediaField {
	return field as MediaField;
}
