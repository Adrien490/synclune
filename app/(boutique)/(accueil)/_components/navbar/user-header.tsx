import type { NavbarSessionData } from "@/shared/types/session.types";
import { SheetClose } from "@/shared/components/ui/sheet";
import { ROUTES } from "@/shared/constants/urls";
import Link from "next/link";

/**
 * Header personnalisé pour l'utilisateur connecté
 * Affiche un message de bienvenue et compteurs rapides (sans avatar)
 */
export function UserHeader({
	session,
	wishlistCount,
	cartCount,
}: {
	session: NavbarSessionData;
	wishlistCount: number;
	cartCount: number;
}) {
	const firstName = session.user.name?.split(" ")[0] || "vous";

	return (
		<div className="px-4 py-4 bg-primary/5 rounded-xl mb-4">
			<SheetClose asChild>
				<Link
					href={ROUTES.ACCOUNT.ROOT}
					className="block group"
					aria-label={`Mon compte - ${firstName}${wishlistCount > 0 ? `, ${wishlistCount} favori${wishlistCount > 1 ? "s" : ""}` : ""}${cartCount > 0 ? `, ${cartCount} article${cartCount > 1 ? "s" : ""}` : ""}`}
				>
					<p className="text-base font-semibold text-foreground">
						Bonjour {firstName}
					</p>
					<p className="text-sm text-muted-foreground mt-0.5">
						{wishlistCount > 0 && (
							<span>{wishlistCount} favori{wishlistCount > 1 ? "s" : ""}</span>
						)}
						{wishlistCount > 0 && cartCount > 0 && <span aria-hidden="true"> • </span>}
						{cartCount > 0 && (
							<span>{cartCount} article{cartCount > 1 ? "s" : ""}</span>
						)}
						{wishlistCount === 0 && cartCount === 0 && (
							<span>Mon espace personnel</span>
						)}
					</p>
				</Link>
			</SheetClose>
		</div>
	);
}
