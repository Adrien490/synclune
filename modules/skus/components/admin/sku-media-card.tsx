"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import type { useUploadThing } from "@/modules/media/utils/uploadthing";
import type { SkuFormInstance } from "./sku-form-types";
import { SkuGalleryField } from "./sku-gallery-field";
import { SkuPrimaryImageField } from "./sku-primary-image-field";

interface SkuMediaCardProps {
	form: SkuFormInstance;
	productTitle: string;
	primaryUpload: ReturnType<typeof useUploadThing>;
	galleryUpload: ReturnType<typeof useMediaUpload>;
}

export function SkuMediaCard({
	form,
	productTitle,
	primaryUpload,
	galleryUpload,
}: SkuMediaCardProps) {
	return (
		<Card
			role="region"
			aria-label="Médias de la variante"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={{ viewTransitionName: "sku-media" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className="text-muted-foreground lg:text-foreground text-sm font-semibold tracking-wide uppercase lg:text-base lg:font-semibold lg:tracking-normal lg:normal-case">
					Médias
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6 px-0 sm:px-0 lg:px-6">
				<form.Field name="primaryImage">
					{(field) => (
						<SkuPrimaryImageField
							value={field.state.value}
							onChange={(value) => field.handleChange(value)}
							productName={productTitle}
							startUpload={primaryUpload.startUpload}
							isUploading={primaryUpload.isUploading}
						/>
					)}
				</form.Field>

				<form.Field name="galleryMedia" mode="array">
					{(field) => (
						<SkuGalleryField
							value={field.state.value}
							setValue={(value) => field.setValue(value)}
							pushValue={(value) => field.pushValue(value)}
							productName={productTitle}
							uploadMedia={galleryUpload.upload}
							isUploading={galleryUpload.isUploading}
						/>
					)}
				</form.Field>
			</CardContent>
		</Card>
	);
}
