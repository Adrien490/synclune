import Image from "next/image";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
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

export function CustomizationRequestCard({
	request,
}: CustomizationRequestCardProps) {
	const status = request.status as CustomizationRequestStatus;
	const colors = CUSTOMIZATION_STATUS_COLORS[status];
	const label = CUSTOMIZATION_STATUS_LABELS[status];

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1 min-w-0">
						<p className="font-medium text-foreground truncate">
							{request.productTypeLabel || "Personnalisation"}
						</p>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
							<span>
								{format(request.createdAt, "d MMMM yyyy", {
									locale: fr,
								})}
							</span>
						</div>
					</div>
					<Badge
						className={`${colors.bg} ${colors.text} border-0 shrink-0`}
					>
						{label}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<p className="text-sm text-muted-foreground line-clamp-3">
					{request.details}
				</p>

				{request.respondedAt && (
					<div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
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
					<div className="flex gap-2 pt-2 border-t border-border/50">
						{request.inspirationProducts.slice(0, 4).map((product) => {
							const imageUrl =
								product.skus[0]?.images[0]?.url;
							return (
								<div
									key={product.id}
									className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0"
								>
									{imageUrl && (
										<Image
											src={imageUrl}
											alt={product.title}
											width={40}
											height={40}
											className="h-full w-full object-cover"
										/>
									)}
								</div>
							);
						})}
						{request.inspirationProducts.length > 4 && (
							<div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">
								+{request.inspirationProducts.length - 4}
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
