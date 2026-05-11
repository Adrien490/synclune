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
	colorDescription?: string | null;
}

export function ColorsRowActions(props: ColorsRowActionsProps) {
	const { sections } = useColorActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="size-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
					aria-label={`Actions pour ${props.colorName}`}
				>
					<EllipsisVertical className="size-4" />
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
