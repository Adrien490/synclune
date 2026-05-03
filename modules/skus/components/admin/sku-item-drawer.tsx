"use client";

import {
	Check,
	ChevronRight,
	Copy,
	DollarSign,
	Package,
	Pencil,
	Power,
	PowerOff,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { STOCK_THRESHOLDS } from "@/shared/constants/cache-tags";
import { useHaptic, type HapticPattern } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { useDuplicateSku } from "@/modules/skus/hooks/use-duplicate-sku";
import { useSetDefaultSku } from "@/modules/skus/hooks/use-set-default-sku";
import { useUpdateProductSkuStatus } from "@/modules/skus/hooks/use-update-sku-status";

import { AdjustStockDialog, ADJUST_STOCK_DIALOG_ID } from "./adjust-stock-dialog";
import {
	DeleteProductSkuAlertDialog,
	DELETE_PRODUCT_SKU_DIALOG_ID,
} from "./delete-sku-alert-dialog";
import { UpdatePriceDialog, UPDATE_PRICE_DIALOG_ID } from "./update-price-dialog";

export const SKU_ITEM_DRAWER_ID = "sku-item-drawer";

const SKU_DIALOGS = (
	<>
		<DeleteProductSkuAlertDialog />
		<AdjustStockDialog />
		<UpdatePriceDialog />
	</>
);

export interface SkuItemDrawerData {
	sku: {
		id: string;
		skuCode: string;
		productSlug: string;
		isDefault: boolean;
		isActive: boolean;
		inventory: number;
		priceInclTax: number;
		compareAtPrice: number | null;
		colorName: string | null;
		materialName: string | null;
		size: string | null;
		primaryImage: {
			url: string;
			blurDataUrl: string | null;
			mediaType: "IMAGE" | "VIDEO";
			altText: string | null;
		} | null;
	};
	[key: string]: unknown;
}

const PRICE_FORMATTER = new Intl.NumberFormat("fr-FR", {
	style: "currency",
	currency: "EUR",
});

const formatPrice = (priceInCents: number) => PRICE_FORMATTER.format(priceInCents / 100);

const getStockVariant = (inventory: number): "destructive" | "warning" | "outline" => {
	if (inventory === 0) return "destructive";
	if (inventory <= STOCK_THRESHOLDS.LOW) return "warning";
	return "outline";
};

const getStockLabel = (inventory: number) => {
	if (inventory === 0) return "Rupture de stock";
	if (inventory <= STOCK_THRESHOLDS.LOW) return `Stock faible · ${inventory}`;
	return `${inventory} en stock`;
};

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
	<h3 className="text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase">
		{children}
	</h3>
);

export function SkuItemDrawer() {
	const drawer = useDialog<SkuItemDrawerData>(SKU_ITEM_DRAWER_ID);
	const deleteAlert = useAlertDialog(DELETE_PRODUCT_SKU_DIALOG_ID);
	const adjustStockDialog = useDialog(ADJUST_STOCK_DIALOG_ID);
	const updatePriceDialog = useDialog(UPDATE_PRICE_DIALOG_ID);
	const { setAsDefault, isPending: isSettingDefault } = useSetDefaultSku();
	const { toggleStatus, isPending: isToggling } = useUpdateProductSkuStatus();
	const { duplicate, isPending: isDuplicating } = useDuplicateSku();
	const haptic = useHaptic();

	const sku = drawer.data?.sku;

	if (!sku) {
		return (
			<AdminItemDrawer
				open={drawer.isOpen}
				onOpenChange={(o) => !o && drawer.close()}
				title=""
				dialogs={SKU_DIALOGS}
			>
				{null}
			</AdminItemDrawer>
		);
	}

	const {
		id,
		skuCode,
		productSlug,
		isDefault,
		isActive,
		inventory,
		priceInclTax,
		compareAtPrice,
		colorName,
		materialName,
		size,
		primaryImage,
	} = sku;

	const stockVariant = getStockVariant(inventory);
	const stockLabel = getStockLabel(inventory);

	const withHaptic = (tier: HapticPattern, fn: () => void) => () => {
		haptic(tier);
		fn();
	};

	const handleAdjustStock = withHaptic("light", () =>
		adjustStockDialog.open({ skuId: id, skuName: skuCode, currentStock: inventory }),
	);
	const handleUpdatePrice = withHaptic("light", () =>
		updatePriceDialog.open({
			skuId: id,
			skuName: skuCode,
			currentPrice: priceInclTax,
			currentCompareAtPrice: compareAtPrice,
		}),
	);
	const handleDuplicate = withHaptic("light", () => {
		drawer.close();
		duplicate(id, skuCode);
	});
	const handleToggleStatus = withHaptic("medium", () => {
		drawer.close();
		toggleStatus(id, !isActive);
	});
	const handleSetDefault = withHaptic("medium", () => {
		drawer.close();
		setAsDefault(id);
	});
	const handleDelete = withHaptic("heavy", () =>
		deleteAlert.open({ skuId: id, skuName: skuCode, isDefault }),
	);
	const handleNavigate = () => {
		haptic("selection");
		drawer.close();
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={skuCode}
			description={`${formatPrice(priceInclTax)} · ${inventory} en stock`}
			dialogs={SKU_DIALOGS}
		>
			{/* Hero header : image + prix + badges */}
			<div className="flex items-start gap-4">
				{primaryImage ? (
					primaryImage.mediaType === "VIDEO" ? (
						<video
							className="border-border size-16 shrink-0 rounded-xl border object-cover"
							muted
							loop
							playsInline
							preload="none"
							aria-label={primaryImage.altText ?? `Vidéo variante ${skuCode}`}
						>
							<source src={primaryImage.url} type={getVideoMimeType(primaryImage.url)} />
						</video>
					) : (
						<Image
							src={primaryImage.url}
							alt=""
							width={64}
							height={64}
							sizes="64px"
							className="border-border size-16 shrink-0 rounded-xl border object-cover"
							{...(primaryImage.blurDataUrl
								? { placeholder: "blur", blurDataURL: primaryImage.blurDataUrl }
								: {})}
						/>
					)
				) : (
					<div
						className="bg-muted border-border flex size-16 shrink-0 items-center justify-center rounded-xl border"
						aria-hidden="true"
					>
						<Package className="text-muted-foreground size-7" />
					</div>
				)}
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="text-2xl font-semibold tracking-tight">{formatPrice(priceInclTax)}</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge variant={isActive ? "default" : "secondary"}>
							{isActive ? "Active" : "Inactive"}
						</Badge>
						{isDefault ? <Badge variant="secondary">Par défaut</Badge> : null}
						<Badge variant={stockVariant} aria-label={stockLabel}>
							{stockLabel}
						</Badge>
					</div>
				</div>
			</div>

			{/* Métadonnées détaillées */}
			{(compareAtPrice !== null ||
				colorName !== null ||
				materialName !== null ||
				size !== null) && (
				<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
					{compareAtPrice ? (
						<>
							<dt className="text-muted-foreground">Prix barré</dt>
							<dd className="text-muted-foreground line-through">{formatPrice(compareAtPrice)}</dd>
						</>
					) : null}
					{colorName ? (
						<>
							<dt className="text-muted-foreground">Couleur</dt>
							<dd>{colorName}</dd>
						</>
					) : null}
					{materialName ? (
						<>
							<dt className="text-muted-foreground">Matériau</dt>
							<dd>{materialName}</dd>
						</>
					) : null}
					{size ? (
						<>
							<dt className="text-muted-foreground">Taille</dt>
							<dd>{size}</dd>
						</>
					) : null}
				</dl>
			)}

			<Separator />

			<div className="flex flex-col gap-2">
				<SectionHeading>Actions</SectionHeading>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/admin/catalogue/produits/${productSlug}/variantes/${id}/modifier`}
						onClick={handleNavigate}
					>
						<Pencil className="size-4 shrink-0" aria-hidden="true" />
						<span>Modifier</span>
						<ChevronRight
							className="text-muted-foreground ml-auto size-4 shrink-0"
							aria-hidden="true"
						/>
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleAdjustStock}
				>
					<Package className="size-4 shrink-0" aria-hidden="true" />
					<span>Ajuster le stock</span>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleUpdatePrice}
				>
					<DollarSign className="size-4 shrink-0" aria-hidden="true" />
					<span>Modifier le prix</span>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleDuplicate}
					disabled={isDuplicating}
				>
					<Copy className="size-4 shrink-0" aria-hidden="true" />
					<span>Dupliquer</span>
				</Button>
				{!isDefault ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleToggleStatus}
						disabled={isToggling}
					>
						{isActive ? (
							<>
								<PowerOff className="size-4 shrink-0" aria-hidden="true" />
								<span>Désactiver</span>
							</>
						) : (
							<>
								<Power className="size-4 shrink-0" aria-hidden="true" />
								<span>Activer</span>
							</>
						)}
					</Button>
				) : null}
				{!isDefault ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleSetDefault}
						disabled={isSettingDefault}
					>
						<Check className="size-4 shrink-0" aria-hidden="true" />
						<span>Définir par défaut</span>
					</Button>
				) : null}
				{!isDefault ? (
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/30 h-12 justify-start gap-3"
						onClick={handleDelete}
					>
						<Trash2 className="size-4 shrink-0" aria-hidden="true" />
						<span>Supprimer</span>
					</Button>
				) : null}
			</div>
		</AdminItemDrawer>
	);
}
