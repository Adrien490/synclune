"use client";

import { EllipsisVertical } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useMaterialActions } from "../hooks/use-material-actions";

interface MaterialsRowActionsProps {
	materialId: string;
	materialName: string;
	materialSlug: string;
	materialDescription: string | null;
	materialIsActive: boolean;
}

export function MaterialsRowActions(props: MaterialsRowActionsProps) {
	const { sections } = useMaterialActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="size-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label={`Actions pour ${props.materialName}`}
				>
					<EllipsisVertical className="size-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={props.materialName}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
