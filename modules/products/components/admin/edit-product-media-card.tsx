"use client";

import type { FailedUpload } from "@/modules/media/types/hooks.types";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";

import type { EditProductFormInstance } from "./edit-product-form-types";
import type { UploadProgressShape } from "./product-media-card-shared";
import { MediaArrayCard } from "./shared/media-array-card";

interface EditProductMediaCardProps {
	form: EditProductFormInstance;
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
	/** Drain offline queue + upload via parent's handleUpload (P1.2) */
	onReplayOffline?: (files: File[]) => void | Promise<void>;
}

export function EditProductMediaCard(props: EditProductMediaCardProps) {
	return (
		<MediaArrayCard
			{...props}
			fieldName="defaultSku.media"
			viewTransitionName="product-edit-media"
			skipUtapiDelete
		/>
	);
}
