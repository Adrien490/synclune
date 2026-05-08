"use client";

import { EllipsisVertical } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useColorActions } from "../hooks/use-color-actions";

interface ColorsRowActionsProps {
	colorId: string;
	colorName: string;
	colorHex: string;
	colorSlug: string;
}

export function ColorsRowActions(props: ColorsRowActionsProps) {
	const { sections } = useColorActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label={`Actions pour ${props.colorName}`}
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={props.colorName}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
