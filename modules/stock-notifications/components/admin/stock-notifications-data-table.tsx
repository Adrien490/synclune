import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/shared/components/ui/empty";
import { Bell } from "lucide-react";
import { StockNotificationsRowActions } from "./stock-notifications-row-actions";
import type {
	GetStockNotificationsAdminReturn,
	StockNotificationAdmin,
} from "../../data/get-stock-notifications-admin";
import { STOCK_NOTIFICATION_STATUS_LABELS } from "../../constants/stock-notification.constants";

// Variants pour les badges de statut
const STATUS_VARIANTS = {
	PENDING: "warning",
	NOTIFIED: "success",
	EXPIRED: "secondary",
	CANCELLED: "destructive",
} as const;

interface StockNotificationsDataTableProps {
	notificationsPromise: Promise<GetStockNotificationsAdminReturn>;
}

export async function StockNotificationsDataTable({
	notificationsPromise,
}: StockNotificationsDataTableProps) {
	const { notifications, pagination } = await notificationsPromise;

	if (notifications.length === 0) {
		return (
			<Card>
				<CardContent className="py-12">
					<Empty>
						<EmptyHeader>
							<Bell className="h-12 w-12 text-muted-foreground" />
							<EmptyTitle>Aucune demande de notification</EmptyTitle>
							<EmptyDescription>
								Les demandes de notification de retour en stock apparaitront ici.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent className="p-0">
				<Table role="table" aria-label="Liste des demandes de notification">
					<TableHeader>
						<TableRow>
							<TableHead className="w-[25%]">Produit</TableHead>
							<TableHead className="w-[15%]">Variante</TableHead>
							<TableHead className="w-[20%]">Email</TableHead>
							<TableHead className="w-[12%]">Statut</TableHead>
							<TableHead className="w-[10%] text-center">Stock</TableHead>
							<TableHead className="hidden sm:table-cell w-[12%]">Date</TableHead>
							<TableHead className="w-[6%] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{notifications.map((notification) => (
							<StockNotificationRow
								key={notification.id}
								notification={notification}
							/>
						))}
					</TableBody>
				</Table>

				<div className="p-4 border-t">
					<CursorPagination
						perPage={50}
						currentPageSize={notifications.length}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

function StockNotificationRow({
	notification,
}: {
	notification: StockNotificationAdmin;
}) {
	const { sku } = notification;
	const imageUrl = sku.images[0]?.url;

	// Construire la description de la variante
	const variantParts: string[] = [];
	if (sku.color) variantParts.push(sku.color.name);
	if (sku.material) variantParts.push(sku.material);
	if (sku.size) variantParts.push(`T.${sku.size}`);
	const variantText = variantParts.join(" / ") || "-";

	return (
		<TableRow>
			{/* Produit */}
			<TableCell>
				<div className="flex items-center gap-3">
					{imageUrl ? (
						<Image
							src={imageUrl}
							alt={sku.product.title}
							width={40}
							height={40}
							sizes="40px"
							quality={80}
							className="rounded-md object-cover"
						/>
					) : (
						<div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
							<Bell className="h-4 w-4 text-muted-foreground" />
						</div>
					)}
					<Link
						href={`/admin/catalogue/produits/${sku.product.id}`}
						className="font-medium hover:underline truncate max-w-[180px]"
					>
						{sku.product.title}
					</Link>
				</div>
			</TableCell>

			{/* Variante */}
			<TableCell>
				<span className="text-sm text-muted-foreground">{variantText}</span>
			</TableCell>

			{/* Email */}
			<TableCell>
				<span className="text-sm truncate max-w-[150px] block">
					{notification.email}
				</span>
				{notification.user && (
					<span className="text-xs text-muted-foreground">
						({notification.user.name || "Utilisateur"})
					</span>
				)}
			</TableCell>

			{/* Statut */}
			<TableCell>
				<Badge variant={STATUS_VARIANTS[notification.status]}>
					{STOCK_NOTIFICATION_STATUS_LABELS[notification.status]}
				</Badge>
			</TableCell>

			{/* Stock actuel */}
			<TableCell className="text-center">
				<span
					className={
						sku.inventory > 0
							? "text-emerald-600 font-medium"
							: "text-destructive font-medium"
					}
				>
					{sku.inventory}
				</span>
			</TableCell>

			{/* Date */}
			<TableCell className="hidden sm:table-cell">
				<span className="text-sm text-muted-foreground">
					{formatDistanceToNow(notification.createdAt, {
						addSuffix: true,
						locale: fr,
					})}
				</span>
			</TableCell>

			{/* Actions */}
			<TableCell className="text-right">
				<StockNotificationsRowActions notification={notification} />
			</TableCell>
		</TableRow>
	);
}

// Skeleton pour le loading
export function StockNotificationsDataTableSkeleton() {
	return (
		<Card>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[25%]">Produit</TableHead>
							<TableHead className="w-[15%]">Variante</TableHead>
							<TableHead className="w-[20%]">Email</TableHead>
							<TableHead className="w-[12%]">Statut</TableHead>
							<TableHead className="w-[10%] text-center">Stock</TableHead>
							<TableHead className="hidden sm:table-cell w-[12%]">Date</TableHead>
							<TableHead className="w-[6%] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 5 }).map((_, i) => (
							<TableRow key={i}>
								<TableCell>
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-muted rounded-md animate-pulse" />
										<div className="h-4 w-32 bg-muted rounded animate-pulse" />
									</div>
								</TableCell>
								<TableCell>
									<div className="h-4 w-20 bg-muted rounded animate-pulse" />
								</TableCell>
								<TableCell>
									<div className="h-4 w-28 bg-muted rounded animate-pulse" />
								</TableCell>
								<TableCell>
									<div className="h-5 w-16 bg-muted rounded animate-pulse" />
								</TableCell>
								<TableCell className="text-center">
									<div className="h-4 w-6 bg-muted rounded animate-pulse mx-auto" />
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									<div className="h-4 w-20 bg-muted rounded animate-pulse" />
								</TableCell>
								<TableCell className="text-right">
									<div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
