import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";
import { PageHeader } from "@/shared/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { getCustomizationRequest } from "@/modules/customizations/data/get-customization-request";
import { CUSTOMIZATION_STATUS_LABELS, CUSTOMIZATION_STATUS_COLORS } from "@/modules/customizations/constants/status.constants";
import { formatDateTime } from "@/shared/utils/dates";
import {
	ArrowLeft,
	Mail,
	Phone,
	User,
	Package,
	Sparkles,
	FileText,
} from "lucide-react";
import { UpdateStatusForm } from "@/modules/customizations/components/admin/update-status-form";

export const metadata: Metadata = {
	title: "Détail demande | Administration",
};

interface CustomizationDetailPageProps {
	params: Promise<{ id: string }>;
}

export default async function CustomizationDetailPage({
	params,
}: CustomizationDetailPageProps) {
	await connection();
	const { id } = await params;

	const request = await getCustomizationRequest(id);

	if (!request) {
		notFound();
	}

	const statusColors = CUSTOMIZATION_STATUS_COLORS[request.status];

	return (
		<>
			<PageHeader
				variant="compact"
				title={`${request.firstName} ${request.lastName}`}
			/>

			<div className="mb-6">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/admin/marketing/personnalisations">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Retour à la liste
					</Link>
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Colonne principale */}
				<div className="lg:col-span-2 space-y-6">
					{/* Informations client */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<User className="h-5 w-5" />
								Informations client
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<p className="text-sm text-muted-foreground">Nom complet</p>
									<p className="font-medium">
										{request.firstName} {request.lastName}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Email</p>
									<a
										href={`mailto:${request.email}`}
										className="font-medium text-primary hover:underline inline-flex items-center gap-1"
									>
										<Mail className="h-4 w-4" />
										{request.email}
									</a>
								</div>
								{request.phone && (
									<div>
										<p className="text-sm text-muted-foreground">Téléphone</p>
										<a
											href={`tel:${request.phone}`}
											className="font-medium text-primary hover:underline inline-flex items-center gap-1"
										>
											<Phone className="h-4 w-4" />
											{request.phone}
										</a>
									</div>
								)}
								<div>
									<p className="text-sm text-muted-foreground">Type de produit</p>
									<p className="font-medium">{request.productTypeLabel}</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Détails du projet */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<FileText className="h-5 w-5" />
								Détails du projet
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="whitespace-pre-wrap text-sm leading-relaxed">
								{request.details}
							</p>
						</CardContent>
					</Card>

					{/* Inspirations */}
					{request.inspirationProducts.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-lg">
									<Sparkles className="h-5 w-5" />
									Créations inspirantes ({request.inspirationProducts.length})
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
									{request.inspirationProducts.map((product) => {
										const primaryImage = product.skus[0]?.images[0];
										return (
											<Link
												key={product.id}
												href={`/admin/catalogue/produits/${product.slug}`}
												className="group block rounded-lg border bg-card overflow-hidden hover:border-primary transition-colors"
											>
												<div className="aspect-square relative bg-muted">
													{primaryImage ? (
														<Image
															src={primaryImage.url}
															alt={product.title}
															fill
															className="object-cover"
														/>
													) : (
														<div className="absolute inset-0 flex items-center justify-center">
															<Package className="h-8 w-8 text-muted-foreground" />
														</div>
													)}
												</div>
												<div className="p-2">
													<p className="text-sm font-medium truncate group-hover:text-primary">
														{product.title}
													</p>
												</div>
											</Link>
										);
									})}
								</div>
							</CardContent>
						</Card>
					)}

				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Statut */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Statut</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-2">
								<span
									className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${statusColors.bg} ${statusColors.text}`}
								>
									<span className={`h-2 w-2 rounded-full ${statusColors.dot}`} />
									{CUSTOMIZATION_STATUS_LABELS[request.status]}
								</span>
							</div>

							<Separator />

							<UpdateStatusForm
								requestId={request.id}
								currentStatus={request.status}
							/>
						</CardContent>
					</Card>

					{/* Métadonnées */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Informations</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Créée le</span>
								<span>{formatDateTime(request.createdAt)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Mise à jour</span>
								<span>{formatDateTime(request.updatedAt)}</span>
							</div>
							{request.respondedAt && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Répondu le</span>
									<span>{formatDateTime(request.respondedAt)}</span>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Actions rapides */}
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<Button variant="outline" className="w-full justify-start" asChild>
								<a
									href={`mailto:${request.email}?subject=RE: Demande de personnalisation - Synclune`}
								>
									<Mail className="h-4 w-4 mr-2" />
									Répondre par email
								</a>
							</Button>
							{request.phone && (
								<Button variant="outline" className="w-full justify-start" asChild>
									<a href={`tel:${request.phone}`}>
										<Phone className="h-4 w-4 mr-2" />
										Appeler
									</a>
								</Button>
							)}
						</CardContent>
					</Card>

					{/* Notes admin */}
					{request.adminNotes && (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Notes internes</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm whitespace-pre-wrap">{request.adminNotes}</p>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</>
	);
}
