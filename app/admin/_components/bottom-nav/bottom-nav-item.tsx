import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import type { NavItem } from "../navigation-config";
import { ActiveIndicator } from "./active-indicator";
import { navItemStyles } from "./styles";

interface BottomNavItemProps {
	item: NavItem;
	isActive: boolean;
}

/**
 * Item de navigation principal (barre du bas)
 */
export function BottomNavItem({ item, isActive }: BottomNavItemProps) {
	const Icon = item.icon;

	return (
		<Link
			href={item.url}
			className={cn(
				navItemStyles.base,
				isActive ? navItemStyles.active : navItemStyles.inactive
			)}
			aria-label={item.title}
			aria-current={isActive ? "page" : undefined}
		>
			{isActive && <ActiveIndicator />}
			<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
			<span className="text-[13px] leading-none">
				{item.shortTitle || item.title}
			</span>
		</Link>
	);
}
