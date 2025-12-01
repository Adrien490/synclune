import { cn } from "@/shared/utils/cn";
import Link from "next/link";

export interface TabNavigationItem {
    label: string;
    value: string;
    href: string;
    /** Nombre d'éléments (optionnel) */
    count?: number;
}

interface TabNavigationProps {
    items: TabNavigationItem[];
    activeValue?: string;
    ariaLabel?: string;
    /** Activer le prefetch des liens (défaut: false) */
    prefetch?: boolean;
    /** Activer le scroll horizontal sur mobile au lieu de wrap (défaut: false) */
    scrollOnMobile?: boolean;
}

/**
 * Composant de navigation par onglets générique
 * Server Component pur avec Next.js Links
 */
export function TabNavigation({
    items,
    activeValue,
    ariaLabel = "Navigation par onglets",
    prefetch = false,
    scrollOnMobile = false,
}: TabNavigationProps) {
    const getTabClasses = (value: string) => {
        const isActive = value === activeValue;

        return cn(
            "inline-flex h-11 sm:h-9 items-center justify-center gap-1.5",
            "rounded-md px-3 py-1.5",
            "text-sm font-medium whitespace-nowrap",
            "transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2",
            // Snap pour scroll mobile
            scrollOnMobile && "snap-start shrink-0",
            isActive && [
                "bg-background text-foreground",
                "shadow-sm border border-border",
                "font-semibold",
            ],
            !isActive && [
                "text-muted-foreground border border-transparent",
                "hover:bg-background/60 hover:text-foreground",
                "hover:border-border/50 hover:shadow-sm",
            ]
        );
    };

    return (
        <nav aria-label={ariaLabel} className="w-full">
            <div className={cn(
                "bg-muted rounded-lg p-1",
                scrollOnMobile
                    ? "flex overflow-x-auto snap-x snap-mandatory scrollbar-none md:flex-wrap md:overflow-visible"
                    : "flex flex-wrap",
                "gap-1 sm:gap-1.5"
            )}>
                {items.map((item) => (
                    <Link
                        key={item.value}
                        href={item.href}
                        prefetch={prefetch}
                        className={getTabClasses(item.value)}
                        aria-current={activeValue === item.value ? "page" : undefined}
                    >
                        {item.label}
                        {item.count !== undefined && (
                            <span
                                title={`${item.count} élément${item.count > 1 ? "s" : ""}`}
                                className={cn(
                                    "ml-1.5 inline-flex items-center justify-center",
                                    "min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs",
                                    activeValue === item.value
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted-foreground/20 text-foreground/70"
                                )}
                            >
                                {item.count}
                            </span>
                        )}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
