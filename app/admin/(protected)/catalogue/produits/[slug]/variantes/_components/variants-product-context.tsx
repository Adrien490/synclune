import Link from "next/link";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import Image from "next/image";
import { CaretRightIcon, PackageIcon } from "@phosphor-icons/react/ssr";

import type { MediaType } from "@/app/generated/prisma/client";
import { PublicationStatus } from "@/app/generated/prisma/enums";
import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import { Badge } from "@/shared/components/ui/badge";

type ContextImage = {
	url: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string | null;
	altText?: string | null;
	mediaType: MediaType;
};

type ContextSku = {
	images: ContextImage[];
};

interface VariantsProductContextProps {
	product: {
		slug: string;
		title: string;
		status: PublicationStatus;
		skus: ContextSku[];
	};
}

const STATUS_LABEL: Record<
	PublicationStatus,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	[PublicationStatus.PUBLIC]: { label: "Public", variant: "default" },
	[PublicationStatus.DRAFT]: { label: "Brouillon", variant: "secondary" },
	[PublicationStatus.ARCHIVED]: { label: "Archivé", variant: "outline" },
};

// V5 : les listes arrivent pré-triées `(position asc, id asc)` — `skus[0]` est le
// représentant et `images[0]` le média principal. Contrairement à la SSOT
// `pickPrimaryImage` (première IMAGE), on garde ici une éventuelle vidéo en tête :
// `resolveMediaThumbSrc` sait en tirer le poster, et retombe sur l'icône sinon.
function pickContextImage(skus: ContextSku[]): ContextImage | null {
	return skus[0]?.images[0] ?? null;
}

/**
 * Carte de contexte produit (mobile-only) en tête de la liste des variantes :
 * rappelle QUEL produit on édite (vignette, statut, nombre de variantes).
 *
 * Ce n'est PAS une affordance de retour — `AdminMobileHeader` porte le chevron
 * « Retour » sur cette route. Son `aria-label` annonçait « Retour à la fiche
 * produit », ce qui en faisait un second bouton retour pour un lecteur d'écran.
 */
export function VariantsProductContext({ product }: VariantsProductContextProps) {
	const image = pickContextImage(product.skus);
	// Une vidéo sans poster n'est pas décodable par l'optimiseur -> icône de secours
	const thumbSrc = image ? resolveMediaThumbSrc(image) : null;
	const statusConfig = STATUS_LABEL[product.status];
	const count = product.skus.length;
	const countLabel = count <= 1 ? "Variante unique" : `${count} variantes`;

	return (
		<Link
			href={`/admin/catalogue/produits/${product.slug}`}
			className="focus-ring bg-card text-card-foreground hover:bg-accent/40 flex items-center gap-3 rounded-lg border p-3 transition-colors md:hidden"
			aria-label={`Fiche produit ${product.title}`}
		>
			{image && thumbSrc ? (
				<Image
					src={thumbSrc}
					alt=""
					width={48}
					height={48}
					sizes="48px"
					quality={IMAGE_QUALITY.THUMBNAIL}
					className="size-12 shrink-0 rounded-md border object-cover"
					{...(image.blurDataUrl ? { placeholder: "blur", blurDataURL: image.blurDataUrl } : {})}
				/>
			) : (
				<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-md border">
					<PackageIcon className="text-muted-foreground size-5" aria-hidden="true" />
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
			<CaretRightIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
		</Link>
	);
}
