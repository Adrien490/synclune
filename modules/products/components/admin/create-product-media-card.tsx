"use client";

import type { FailedUpload } from "@/modules/media/types/hooks.types";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";

import type { CreateProductFormInstance } from "./create-product-form-types";
import type { UploadProgressShape } from "./product-media-card-shared";
import { MediaArrayCard } from "./shared/media-array-card";

interface CreateProductMediaCardProps {
	form: CreateProductFormInstance;
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
	/** Drain offline queue + upload via parent's handleUpload (P1.2) */
	onReplayOffline?: (files: File[]) => void | Promise<void>;
}

export function CreateProductMediaCard(props: CreateProductMediaCardProps) {
	return (
		<MediaArrayCard
			{...props}
			fieldName="initialSku.media"
			viewTransitionName="product-create-media"
			offlineContextKey="create-product"
		/>
	);
}
