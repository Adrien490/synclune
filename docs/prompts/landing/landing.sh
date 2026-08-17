#!/usr/bin/env bash
# Séquence complète de la landing Synclune.
# Chaque tour repart du .pen produit par le précédent.
#
# Usage :  ./landing.sh            # toute la séquence
#          ./landing.sh 03         # un seul tour, sur le fichier existant
#
# Artefacts par tour : apercus/tour-<n>.png (export ×2, revoyable tour par tour)
# et usage/tour-<n>.json (tokens + coût) — régénérables, hors git comme le .pen.
#
# Prérequis : `pnpm add -g @pen.dev/cli` (PAS @pencil.dev/cli, déprécié) puis `pen login`.
#
# ⚠️ `--prompt-file` n'est PAS un fichier de prompt : c'est une PIÈCE JOINTE (image ou
# texte annexe). Le texte du prompt passe forcément par `--prompt`, d'où les $(cat …).

set -Eeuo pipefail
cd "$(dirname "$0")"

PEN_FILE="${PEN_FILE:-landing.pen}"
MODEL="${PEN_MODEL:-claude-fable-5}"
SITE_URL="${SITE_URL:-http://localhost:3000}"
CTX="$(cat _conduite.md synclune-univers.md synclune-systeme.md)"
CHECK="$(cat _checklist.md)"

# En cas d'échec, dire comment revenir à l'état d'avant le tour — la sauvegarde
# existait déjà, le mode d'emploi manquait.
CURRENT_TOUR=""
on_fail() {
	if [[ -n "$CURRENT_TOUR" && -f "${PEN_FILE}.bak-${CURRENT_TOUR}" ]]; then
		echo "échec au tour $CURRENT_TOUR — restaurer l'état d'avant :  cp '${PEN_FILE}.bak-${CURRENT_TOUR}' '$PEN_FILE'" >&2
	fi
}
trap on_fail ERR

# Modèle : claude-fable-5 partout (PEN_MODEL pour surcharger). Le levier de coût et
# de latence n'est donc pas le modèle mais l'EFFORT — une seule carte, partagée par
# les deux modes, pour que rejouer `./landing.sh 00` tourne au même effort que la
# séquence complète. C'est aussi elle qui valide l'argument du mode mono-tour.
# Échelle du CLI pour Claude : low · medium · high · xhigh · max.
effort_for() {
	case "$1" in
		00) echo max ;;    # bootstrap : variables, composants, frames — les huit tours en dépendent
		01) echo xhigh ;;  # hero — ~100 % de l'audience, le plus cher à refaire
		02) echo high ;;   # créations — la section qui convertit
		03) echo high ;;   # collections
		04) echo high ;;   # types — 8 vignettes dessinées : le plus chargé en illustration
		05) echo high ;;   # atelier — c'est de la copie, pas de la mise en page
		06) echo medium ;; # faq
		07) echo medium ;; # carte de partage + bannière cookies
		08) echo high ;;   # assemblage — le tour qui attrape les défauts inter-sections
		09) echo high ;;   # améliorations — retouches trans-sections + re-montage, tout se mesure
		10) echo medium ;; # états d'interaction — deux variants + une frame d'état
		*)
			echo "tour inconnu : « $1 » — attendu : 00 à 10, sur deux chiffres (03, pas 3)" >&2
			return 1
			;;
	esac
}

# Quatre contrôles avant de payer le moindre tour : l'app fermée (app et CLI
# tiennent CHACUN leur copie du .pen — le dernier qui sauve écrase l'autre,
# constaté le 2026-08-17), l'auth (sans session, l'échec arriverait après
# plusieurs minutes), le site local (le tour 00 importe la chrome depuis
# $SITE_URL — le repli existe, mais autant le savoir avant), et la fraîcheur
# du CLI (recommandation de la skill officielle : une fois par session).
preflight() {
	if pgrep -xq Pen; then
		echo "l'app Pen est ouverte — ferme-la d'abord : elle tient sa propre copie du .pen et le dernier qui sauve écrase l'autre." >&2
		exit 1
	fi
	if ! pen status >/dev/null 2>&1; then
		echo "pen n'est pas authentifié — lance « pen login » d'abord." >&2
		exit 1
	fi
	if ! curl -sf --max-time 5 "$SITE_URL" >/dev/null 2>&1; then
		echo "⚠ $SITE_URL ne répond pas : le tour 00 dessinera la chrome au lieu de l'importer." >&2
	fi
	local installed latest
	installed="$(pen version 2>/dev/null | awk '{print $NF}')" || installed=""
	latest="$(npm view @pen.dev/cli version 2>/dev/null)" || latest=""
	if [[ -n "$installed" && -n "$latest" && "$installed" != "$latest" ]]; then
		echo "⚠ CLI $installed installé, $latest publié — « pnpm add -g @pen.dev/cli » pour mettre à jour." >&2
	fi
}

run() {
	local tour="$1" effort file notes="" check="" prompt
	effort="$(effort_for "$tour")"
	# Glob strict : zéro ou plusieurs correspondances feraient passer un nom de
	# fichier invalide à `cat` plus bas — on exige exactement un fichier.
	local matches=("${tour}"-*.md)
	if [[ ${#matches[@]} -ne 1 || ! -f "${matches[0]}" ]]; then
		echo "il faut exactement un fichier ${tour}-*.md dans $(pwd) — trouvé(s) : ${matches[*]}" >&2
		exit 1
	fi
	file="${matches[0]}"

	# Un tour écrit dans le .pen qu'il lit (--in/--out sur le même fichier) : sans
	# copie préalable, un tour qui déraille rend l'état précédent irrécupérable.
	# CURRENT_TOUR n'est posé qu'après la copie : avant elle, il n'y a rien à restaurer.
	[[ -f "$PEN_FILE" ]] && cp "$PEN_FILE" "${PEN_FILE}.bak-${tour}"
	CURRENT_TOUR="$tour"

	# Le carnet est ce qui relie les tours : chaque `pen` est un processus neuf.
	# On l'injecte dans le prompt (lecture garantie) ET on donne au CLI le dossier
	# de travail (`--repo`) pour que l'agent puisse y écrire son entrée.
	[[ -f NOTES.md ]] && notes="$(printf '\n\n---\n\n# NOTES.md — décisions des tours précédents\n\n%s' "$(cat NOTES.md)")"

	# La checklist commune ne vaut que pour les tours de SECTION : 00 et 07 à 10
	# portent chacun leur propre bloc de sortie.
	case "$tour" in
		0[1-6]) check="$(printf '\n\n---\n\n%s' "$CHECK")" ;;
	esac

	prompt="$(printf '%s\n\n---\n\n%s%s%s' "$CTX" "$(cat "$file")" "$check" "$notes")"
	prompt="${prompt//http:\/\/localhost:3000/$SITE_URL}"

	mkdir -p apercus usage

	if [[ "$tour" == "00" ]]; then
		pen --out "$PEN_FILE" --repo "$PWD" --model "$MODEL" --effort "$effort" --enable-preview \
			--export "apercus/tour-${tour}.png" --export-scale 2 --usage "usage/tour-${tour}.json" \
			--prompt "$prompt"
	else
		pen --in "$PEN_FILE" --out "$PEN_FILE" --repo "$PWD" --model "$MODEL" --effort "$effort" --enable-preview \
			--export "apercus/tour-${tour}.png" --export-scale 2 --usage "usage/tour-${tour}.json" \
			--prompt "$prompt"
	fi
	echo "── tour $tour terminé — aperçu : apercus/tour-${tour}.png · usage : usage/tour-${tour}.json"
}

preflight

if [[ $# -gt 0 ]]; then
	run "$1"
	exit 0
fi

for tour in 00 01 02 03 04 05 06 07 08 09 10; do
	run "$tour"
done
