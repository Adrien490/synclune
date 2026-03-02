import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MessageSquare } from "lucide-react";
import type { UserCustomizationRequest } from "../../data/get-user-customization-requests";
import {
	CUSTOMIZATION_STATUS_LABELS,
	CUSTOMIZATION_STATUS_COLORS,
} from "../../constants/status.constants";
import type { CustomizationRequestStatus } from "../../types/customization.types";

interface CustomizationRequestCardProps {
	request: UserCustomizationRequest;
}

export function CustomizationRequestCard({ request }: CustomizationRequestCardProps) {
	const status = request.status as CustomizationRequestStatus;
	const colors = CUSTOMIZATION_STATUS_COLORS[status];
	const label = CUSTOMIZATION_STATUS_LABELS[status];

	return (
		<Card className="gap-0 py-0 shadow-none">
			<CardContent className="space-y-3 p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 space-y-1">
						<p className="text-foreground truncate font-medium">
							{request.productTypeLabel || "Personnalisation"}
						</p>
						<div className="text-muted-foreground flex items-center gap-2 text-xs">
							<Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
							<span>
								{format(request.createdAt, "d MMMM yyyy", {
									locale: fr,
								})}
							</span>
						</div>
					</div>
					<Badge className={cn(colors.bg, colors.text, "shrink-0 border-0")}>
						<span aria-hidden="true" className="mr-1">
							{colors.symbol}
						</span>
						{label}
					</Badge>
				</div>

				<p className="text-muted-foreground line-clamp-3 text-sm">{request.details}</p>

				{request.respondedAt && (
					<div className="text-muted-foreground border-border/50 flex items-center gap-2 border-t pt-2 text-xs">
						<MessageSquare className="h-3 w-3 shrink-0" aria-hidden="true" />
						<span>
							Réponse le{" "}
							{format(request.respondedAt, "d MMMM yyyy", {
								locale: fr,
							})}
						</span>
					</div>
				)}

				{request.inspirationProducts.length > 0 && (
					<div className="border-border/50 flex gap-2 border-t pt-2">
						{request.inspirationProducts.slice(0, 4).map((product) => {
							const imageUrl = product.skus[0]?.images[0]?.url;
							return (
								<div
									key={product.id}
									className="bg-muted h-10 w-10 shrink-0 overflow-hidden rounded-md"
								>
									{imageUrl && (
										<Image
											src={imageUrl}
											alt={product.title}
											width={40}
											height={40}
											sizes="40px"
											className="h-full w-full object-cover"
										/>
									)}
								</div>
							);
						})}
						{request.inspirationProducts.length > 4 && (
							<div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xs">
								+{request.inspirationProducts.length - 4}
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
