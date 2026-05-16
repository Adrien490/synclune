"use client";

import { MediaArrayCard } from "@/modules/products/components/admin/shared/media-array-card";
import type { FailedUpload } from "@/modules/media/types/hooks.types";
import type { UploadProgressShape } from "@/modules/products/components/admin/product-media-card-shared";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";

import type { SkuFormInstance } from "./sku-form-types";

interface SkuMediaCardProps {
	form: SkuFormInstance;
	isMediaUploading: boolean;
	uploadProgress: UploadProgressShape | null;
	handleUpload: (files: File[], field: MediaField) => void;
	setDeletedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
	failedFiles: FailedUpload[];
	onCancel: () => void;
	onCancelOne?: (fileName: string) => void;
	onRetry: () => void;
	onRetryOne?: (file: File) => void;
	onDismissErrors: () => void;
	/** Routing key matching the parent's enableOfflineQueue context */
	offlineContextKey?: string;
	/** Drain offline queue + upload via parent's handleUpload */
	onReplayOffline?: (files: File[]) => void | Promise<void>;
	/** "sku-create" pour le formulaire de création, "sku-edit" pour l'édition. */
	viewTransitionPrefix?: "sku-create" | "sku-edit";
	/** True pour les forms d'édition (action serveur diffe et supprime côté UploadThing). */
	skipUtapiDelete?: boolean;
}

export function SkuMediaCard({
	viewTransitionPrefix = "sku-create",
	skipUtapiDelete = false,
	...props
}: SkuMediaCardProps) {
	return (
		<MediaArrayCard
			{...props}
			fieldName="media"
			viewTransitionName={`${viewTransitionPrefix}-media`}
			ariaLabel="Médias de la variante"
			skipUtapiDelete={skipUtapiDelete}
		/>
	);
}
