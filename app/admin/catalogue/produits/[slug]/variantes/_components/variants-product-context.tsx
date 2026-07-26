import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Package } from "lucide-react";

import type { MediaType } from "@/app/generated/prisma/client";
import { ProductStatus } from "@/app/generated/prisma/enums";
import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import { Badge } from "@/shared/components/ui/badge";

type ContextImage = {
	url: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string | null;
	altText?: string | null;
	mediaType: MediaType;
	isPrimary?: boolean;
};

type ContextSku = {
	isDefault: boolean;
	images: ContextImage[];
};

interface VariantsProductContextProps {
	product: {
		slug: string;
		title: string;
		status: ProductStatus;
		skus: ContextSku[];
	};
}

const STATUS_LABEL: Record<
	ProductStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[ProductStatus.PUBLIC]: { label: "Public", variant: "default" },
	[ProductStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[ProductStatus.ARCHIVED]: { label: "Archivé", variant: "outline" },
};

function pickPrimaryImage(skus: ContextSku[]): ContextImage | null {
	const defaultSku = skus.find((s) => s.isDefault) ?? skus[0];
	if (!defaultSku) return null;
	return defaultSku.images.find((img) => img.isPrimary) ?? defaultSku.images[0] ?? null;
}

/**
 * Carte de contexte produit (mobile-only) en tête de la liste des variantes.
 * Rappelle quel produit on édite quand le breadcrumb header n'affiche que
 * « Variantes » + slug formaté.
 */
export function VariantsProductContext({ product }: VariantsProductContextProps) {
	const image = pickPrimaryImage(product.skus);
	// Une vidéo sans poster n'est pas décodable par l'optimiseur -> icône de secours
	const thumbSrc = image ? resolveMediaThumbSrc(image) : null;
	const statusConfig = STATUS_LABEL[product.status];
	const count = product.skus.length;
	const countLabel = count <= 1 ? "Variante unique" : `${count} variantes`;

	return (
		<Link
			href={`/admin/catalogue/produits/${product.slug}`}
			className="bg-card text-card-foreground hover:bg-accent/40 focus-visible:ring-ring flex items-center gap-3 rounded-lg border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none md:hidden"
			aria-label={`Retour à la fiche produit ${product.title}`}
		>
			{image && thumbSrc ? (
				<Image
					src={thumbSrc}
					alt=""
					width={48}
					height={48}
					sizes="48px"
					className="size-12 shrink-0 rounded-md border object-cover"
					{...(image.blurDataUrl ? { placeholder: "blur", blurDataURL: image.blurDataUrl } : {})}
				/>
			) : (
				<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border">
					<Package className="text-muted-foreground size-5" aria-hidden="true" />
				</div>
			)}
			<div className="min-w-0 flex-1">
				<p className="text-muted-foreground text-2xs leading-none font-medium tracking-wider uppercase">
					Produit
				</p>
				<p className="mt-1 truncate text-sm font-semibold">{product.title}</p>
				<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
					<Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
					<span className="text-muted-foreground">{countLabel}</span>
				</div>
			</div>
			<ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
		</Link>
	);
}
