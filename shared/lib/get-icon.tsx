import type { IconName } from "@/shared/constants/navigation";
import {
	Circle,
	FolderOpen,
	Gem,
	Heart,
	Home,
	Info,
	LayoutDashboard,
	LogIn,
	ShoppingCart,
	Sparkles,
	User,
	type LucideIcon,
} from "lucide-react";

/**
 * Mapping des noms d'icônes vers les composants Lucide
 *
 * Utilisé pour passer des icônes de Server Components à Client Components
 * via des string identifiers au lieu des composants directement
 */
const ICON_MAP: Record<IconName, LucideIcon> = {
	home: Home,
	gem: Gem,
	sparkles: Sparkles,
	"shopping-cart": ShoppingCart,
	user: User,
	"folder-open": FolderOpen,
	heart: Heart,
	"log-in": LogIn,
	info: Info,
	"layout-dashboard": LayoutDashboard,
};

/**
 * Récupère le composant d'icône correspondant au nom
 *
 * @param iconName - Nom de l'icône
 * @returns Composant Lucide Icon ou Circle comme fallback
 */
export function getIcon(iconName?: IconName): LucideIcon | undefined {
	if (!iconName) return undefined;
	return ICON_MAP[iconName] ?? Circle;
}
