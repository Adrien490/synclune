"use client";

import { InstagramIcon } from "@/shared/components/icons/instagram-icon";
import { TikTokIcon } from "@/shared/components/icons/tiktok-icon";
import { BRAND } from "@/shared/constants/brand";
import Link from "next/link";
import { useMenuSheetNavigate } from "./menu-sheet-navigate-context";

/** Cellule « Écrire à Léane » — même surface que la bande d'accès rapide. */
const footLinkClassName =
	"focus-ring border-border/60 bg-card text-foreground/85 can-hover:hover:text-foreground inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border px-3 text-sm font-medium motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)] motion-safe:active:scale-[0.98] can-hover:motion-safe:active:scale-[0.98]";

// Admin link lives in MenuSheetNav's dedicated section for better discoverability.
/**
 * Pied du volet : la sortie « Écrire à Léane » (absente de toute l'interface
 * sous `lg` avant l'étal de poche, P2 de l'audit menu-sheet 2026-08-05) +
 * social + copyright.
 *
 * Le lien passe par `useMenuSheetNavigate` (prop contrôlée, jamais
 * `SheetClose` — cf. `menu-sheet-navigate-context`) et porte `replace` :
 * c'est le contrat que `menu-sheet-link-navigation.regression.test.tsx` impose
 * à TOUT lien sans `target` du panneau, mailto compris (l'attribut y est
 * inerte, la navigation externe n'empruntant pas le routeur).
 *
 * ⚠️ La cellule « Aide » qui l'accompagnait est partie le 2026-08-08 avec la
 * section FAQ (à refaire) : elle pointait l'ancre `/#faq`, qui n'existe plus.
 * La rangée passe donc de deux colonnes à une. Quand la FAQ revient, remettre
 * `grid-cols-2` — et si elle redevient une ANCRE, se rappeler pourquoi ça
 * marchait : la cible vivait dans le shell STATIQUE de l'accueil, hors de
 * toute frontière `Suspense`. Une cible encore suspendue au moment où le
 * routeur cherche l'ancre laisse la page en haut, sans erreur.
 */
export function MenuSheetFooter() {
	const onNavigate = useMenuSheetNavigate();

	return (
		<footer className="relative z-10 shrink-0 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
			<div className="mb-3 grid grid-cols-1 gap-2">
				<Link
					href={`mailto:${BRAND.contact.email}`}
					replace
					prefetch={null}
					onClick={onNavigate}
					className={footLinkClassName}
				>
					Écrire à Léane
				</Link>
			</div>

			{/* Social + copyright sur UNE rangée : chaque rangée de pied gagnée remonte
			    le contenu du volet au-dessus du pli (budget ~630 px de l'artifact). */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-1">
					<a
						href={BRAND.social.instagram.url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-muted-foreground can-hover:hover:text-foreground can-hover:hover:bg-accent focus-ring inline-flex size-11 items-center justify-center rounded-full motion-safe:transition-all motion-safe:duration-[var(--duration-fast)] motion-safe:active:scale-95"
						aria-label="Suivre Synclune sur Instagram (nouvelle fenêtre)"
					>
						<InstagramIcon decorative size={18} />
					</a>
					<a
						href={BRAND.social.tiktok.url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-muted-foreground can-hover:hover:text-foreground can-hover:hover:bg-accent focus-ring inline-flex size-11 items-center justify-center rounded-full motion-safe:transition-all motion-safe:duration-[var(--duration-fast)] motion-safe:active:scale-95"
						aria-label="Suivre Synclune sur TikTok (nouvelle fenêtre)"
					>
						<TikTokIcon decorative size={18} />
					</a>
				</div>

				<p className="text-muted-foreground text-xs" suppressHydrationWarning>
					© {new Date().getFullYear()} {BRAND.name}
				</p>
			</div>
		</footer>
	);
}
