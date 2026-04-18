"use client";

import {
	Archive,
	ArchiveRestore,
	ChevronRight,
	Copy,
	Eye,
	FolderPlus,
	LayoutList,
	Package,
	Pencil,
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
import { cn } from "@/shared/utils/cn";

import { ARCHIVE_PRODUCT_DIALOG_ID } from "./archive-product-alert-dialog";
import { CHANGE_PRODUCT_STATUS_DIALOG_ID } from "./change-product-status-alert-dialog";
import { DELETE_PRODUCT_DIALOG_ID } from "./delete-product-alert-dialog";
import { DUPLICATE_PRODUCT_DIALOG_ID } from "./duplicate-product-alert-dialog";
import { MANAGE_COLLECTIONS_DIALOG_ID } from "./manage-collections-dialog";

export const PRODUCT_ITEM_DRAWER_ID = "product-item-drawer";

type ProductStatus = "DRAFT" | "PUBLIC" | "ARCHIVED";

export interface ProductItemDrawerData {
	product: {
		id: string;
		slug: string;
		title: string;
		status: ProductStatus;
		priceDisplay: string;
		stock: number;
		variantsCount: number;
		typeLabel: string | null;
		primaryImage: {
			url: string;
			thumbnailUrl: string | null;
			blurDataUrl: string | null;
		} | null;
	};
	[key: string]: unknown;
}

const STATUS_CONFIG: Record<
	ProductStatus,
	{ label: string; variant: "default" | "secondary" | "outline"; dotClass: string }
> = {
	PUBLIC: { label: "Public", variant: "default", dotClass: "bg-emerald-500" },
	DRAFT: { label: "Brouillon", variant: "secondary", dotClass: "bg-amber-500" },
	ARCHIVED: { label: "Archivé", variant: "outline", dotClass: "bg-muted-foreground" },
};

const getStockVariant = (stock: number): "destructive" | "warning" | "outline" => {
	if (stock === 0) return "destructive";
	if (stock <= STOCK_THRESHOLDS.LOW) return "warning";
	return "outline";
};

const getStockLabel = (stock: number) => {
	if (stock === 0) return "Rupture de stock";
	if (stock <= STOCK_THRESHOLDS.LOW) return `Stock faible · ${stock}`;
	return `${stock} en stock`;
};

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
	<h3 className="text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase">
		{children}
	</h3>
);

export function ProductItemDrawer() {
	const drawer = useDialog<ProductItemDrawerData>(PRODUCT_ITEM_DRAWER_ID);
	const deleteAlert = useAlertDialog(DELETE_PRODUCT_DIALOG_ID);
	const changeStatusAlert = useAlertDialog(CHANGE_PRODUCT_STATUS_DIALOG_ID);
	const archiveAlert = useAlertDialog(ARCHIVE_PRODUCT_DIALOG_ID);
	const duplicateAlert = useAlertDialog(DUPLICATE_PRODUCT_DIALOG_ID);
	const collectionsDialog = useDialog(MANAGE_COLLECTIONS_DIALOG_ID);
	const haptic = useHaptic();

	const product = drawer.data?.product;

	if (!product) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const { id, slug, title, status, priceDisplay, stock, variantsCount, typeLabel, primaryImage } =
		product;
	const statusConfig = STATUS_CONFIG[status];
	const stockVariant = getStockVariant(stock);
	const isArchived = status === "ARCHIVED";

	const withHaptic = (tier: HapticPattern, fn: () => void) => () => {
		haptic(tier);
		fn();
	};

	const closeAndOpen = (openFn: () => void) => () => {
		drawer.close();
		openFn();
	};

	const handleDuplicate = withHaptic(
		"light",
		closeAndOpen(() => duplicateAlert.open({ productId: id, productTitle: title })),
	);
	const handleManageCollections = withHaptic(
		"light",
		closeAndOpen(() => collectionsDialog.open({ productId: id, productTitle: title })),
	);
	const handleChangeStatus = (targetStatus: ProductStatus) =>
		withHaptic(
			"light",
			closeAndOpen(() =>
				changeStatusAlert.open({
					productId: id,
					productTitle: title,
					currentStatus: status,
					targetStatus,
				}),
			),
		);
	const handleArchive = withHaptic(
		"medium",
		closeAndOpen(() =>
			archiveAlert.open({ productId: id, productTitle: title, productStatus: status }),
		),
	);
	const handleRestore = withHaptic(
		"medium",
		closeAndOpen(() =>
			archiveAlert.open({ productId: id, productTitle: title, productStatus: status }),
		),
	);
	const handleDelete = withHaptic(
		"heavy",
		closeAndOpen(() => deleteAlert.open({ productId: id, productTitle: title })),
	);
	const handleNavigate = () => {
		haptic("selection");
		drawer.close();
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={title}
			description={`${priceDisplay} · ${stock} en stock`}
		>
			{/* Hero header : image + status + chips */}
			<div className="flex items-start gap-4">
				{primaryImage ? (
					<Image
						src={primaryImage.thumbnailUrl ?? primaryImage.url}
						alt=""
						width={64}
						height={64}
						sizes="64px"
						className="border-border size-16 shrink-0 rounded-xl border object-cover"
						{...(primaryImage.blurDataUrl
							? { placeholder: "blur", blurDataURL: primaryImage.blurDataUrl }
							: {})}
					/>
				) : (
					<div
						className="bg-muted border-border flex size-16 shrink-0 items-center justify-center rounded-xl border"
						aria-hidden="true"
					>
						<Package className="text-muted-foreground size-7" />
					</div>
				)}
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="text-2xl font-semibold tracking-tight">{priceDisplay}</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge variant={statusConfig.variant} className="gap-1.5">
							<span
								className={cn("size-1.5 rounded-full", statusConfig.dotClass)}
								aria-hidden="true"
							/>
							{statusConfig.label}
						</Badge>
						<Badge variant={stockVariant} aria-label={getStockLabel(stock)}>
							{getStockLabel(stock)}
						</Badge>
					</div>
				</div>
			</div>

			{/* Métadonnées en chips */}
			{(variantsCount > 0 || typeLabel) && (
				<div className="flex flex-wrap items-center gap-1.5">
					{variantsCount > 0 && (
						<Badge variant="outline" className="gap-1.5">
							<LayoutList className="size-3" aria-hidden="true" />
							{variantsCount} variante{variantsCount > 1 ? "s" : ""}
						</Badge>
					)}
					{typeLabel && <Badge variant="outline">{typeLabel}</Badge>}
				</div>
			)}

			<Separator />

			{/* Section Gérer */}
			<div className="flex flex-col gap-2">
				<SectionHeading>Gérer</SectionHeading>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link
						href={`/creations/${slug}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={handleNavigate}
					>
						<Eye className="size-4 shrink-0" aria-hidden="true" />
						<span>Voir sur la boutique</span>
						<ChevronRight
							className="text-muted-foreground ml-auto size-4 shrink-0"
							aria-hidden="true"
						/>
					</Link>
				</Button>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/catalogue/produits/${slug}/modifier`} onClick={handleNavigate}>
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
					onClick={handleDuplicate}
				>
					<Copy className="size-4 shrink-0" aria-hidden="true" />
					<span>Dupliquer</span>
				</Button>
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/catalogue/produits/${slug}/variantes`} onClick={handleNavigate}>
						<LayoutList className="size-4 shrink-0" aria-hidden="true" />
						<span>Gérer variantes</span>
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
					onClick={handleManageCollections}
				>
					<FolderPlus className="size-4 shrink-0" aria-hidden="true" />
					<span>Gérer collections</span>
				</Button>
			</div>

			{/* Section Statut (non archivé) */}
			{!isArchived && (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						<SectionHeading>Statut</SectionHeading>
						{status !== "DRAFT" && (
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={handleChangeStatus("DRAFT")}
							>
								<Pencil className="size-4 shrink-0" aria-hidden="true" />
								<span>Passer en brouillon</span>
							</Button>
						)}
						{status !== "PUBLIC" && (
							<Button
								variant="outline"
								size="lg"
								className="h-12 justify-start gap-3"
								onClick={handleChangeStatus("PUBLIC")}
							>
								<Eye className="size-4 shrink-0" aria-hidden="true" />
								<span>Passer en public</span>
							</Button>
						)}
						<Button
							variant="outline"
							size="lg"
							className="h-12 justify-start gap-3"
							onClick={handleArchive}
						>
							<Archive className="size-4 shrink-0" aria-hidden="true" />
							<span>Archiver</span>
						</Button>
					</div>
				</>
			)}

			{/* Section Archive (archivé) */}
			{isArchived && (
				<>
					<Separator />
					<div className="flex flex-col gap-2">
						<SectionHeading>Archive</SectionHeading>
						<Button
							variant="outline"
							size="lg"
							className="h-12 justify-start gap-3"
							onClick={handleRestore}
						>
							<ArchiveRestore className="size-4 shrink-0" aria-hidden="true" />
							<span>Restaurer</span>
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/30 h-12 justify-start gap-3"
							onClick={handleDelete}
						>
							<Trash2 className="size-4 shrink-0" aria-hidden="true" />
							<span>Supprimer définitivement</span>
						</Button>
					</div>
				</>
			)}
		</AdminItemDrawer>
	);
}
