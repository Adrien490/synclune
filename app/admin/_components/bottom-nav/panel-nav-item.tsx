import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import type { NavItem } from "../navigation-config";
import { ActiveIndicator } from "./active-indicator";
import { panelItemStyles } from "./styles";

interface PanelNavItemProps {
	item: NavItem;
	isActive: boolean;
	onClick: () => void;
}

/**
 * Item de navigation dans le drawer
 */
export function PanelNavItem({ item, isActive, onClick }: PanelNavItemProps) {
	const Icon = item.icon;

	return (
		<Link
			href={item.url}
			onClick={onClick}
			className={cn(
				panelItemStyles.base,
				isActive ? panelItemStyles.active : panelItemStyles.inactive
			)}
			aria-current={isActive ? "page" : undefined}
		>
			{isActive && <ActiveIndicator />}
			<Icon className="size-6 shrink-0" aria-hidden="true" />
			<span className="text-xs text-center leading-tight tracking-tight line-clamp-2">
				{item.shortTitle || item.title}
			</span>
		</Link>
	);
}
