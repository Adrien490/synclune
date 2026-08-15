#!/usr/bin/env bash
# Séquence complète de la landing Synclune.
# Chaque tour repart du .pen produit par le précédent.
#
# Usage :  ./landing.sh            # toute la séquence
#          ./landing.sh 03         # un seul tour, sur le fichier existant
#
# Prérequis : `pnpm add -g @pen.dev/cli` (PAS @pencil.dev/cli, déprécié) puis `pen login`.
#
# ⚠️ `--prompt-file` n'est PAS un fichier de prompt : c'est une PIÈCE JOINTE (image ou
# texte annexe). Le texte du prompt passe forcément par `--prompt`, d'où les $(cat …).

set -euo pipefail
cd "$(dirname "$0")"

PEN_FILE="${PEN_FILE:-landing.pen}"
MODEL="${PEN_MODEL:-claude-fable-5}"
SITE_URL="${SITE_URL:-http://localhost:3000}"
CTX="$(cat _conduite.md synclune-univers.md synclune-systeme.md)"
CHECK="$(cat _checklist.md)"

# Modèle : claude-fable-5 partout (PEN_MODEL pour surcharger). Le levier de coût et
# de latence n'est donc pas le modèle mais l'EFFORT — une seule carte, partagée par
# les deux modes, pour que rejouer `./landing.sh 00` tourne au même effort que la
# séquence complète. C'est aussi elle qui valide l'argument du mode mono-tour.
effort_for() {
	case "$1" in
		00) echo xhigh ;;  # bootstrap : variables, composants, frames — tout en dépend
		01) echo xhigh ;;  # hero — ~100 % de l'audience, le plus cher à refaire
		02) echo high ;;   # créations — la section qui convertit
		03) echo high ;;   # collections
		04) echo high ;;   # types — 8 vignettes dessinées : le plus chargé en illustration
		05) echo high ;;   # atelier — c'est de la copie, pas de la mise en page
		06) echo medium ;; # faq
		07) echo medium ;; # carte de partage + bannière cookies
		08) echo high ;;   # assemblage — le tour qui attrape les défauts inter-sections
		*)
			echo "tour inconnu : « $1 » — attendu : 00 à 08, sur deux chiffres (03, pas 3)" >&2
			return 1
			;;
	esac
}

run() {
	local tour="$1" effort file notes="" prompt
	effort="$(effort_for "$tour")"
	file="$(ls "${tour}"-*.md 2>/dev/null)" || {
		echo "aucun fichier ${tour}-*.md dans $(pwd)" >&2
		exit 1
	}

	# Un tour écrit dans le .pen qu'il lit (--in/--out sur le même fichier) : sans
	# copie préalable, un tour qui déraille rend l'état précédent irrécupérable.
	[[ -f "$PEN_FILE" ]] && cp "$PEN_FILE" "${PEN_FILE}.bak-${tour}"

	# Le carnet est ce qui relie les tours : chaque `pen` est un processus neuf.
	# On l'injecte dans le prompt (lecture garantie) ET on donne au CLI le dossier
	# de travail (`--repo`) pour que l'agent puisse y écrire son entrée.
	[[ -f NOTES.md ]] && notes="$(printf '\n\n---\n\n# NOTES.md — décisions des tours précédents\n\n%s' "$(cat NOTES.md)")"

	prompt="$(printf '%s\n\n---\n\n%s\n\n---\n\n%s%s' "$CTX" "$(cat "$file")" "$CHECK" "$notes")"
	prompt="${prompt//http:\/\/localhost:3000/$SITE_URL}"

	if [[ "$tour" == "00" ]]; then
		pen --out "$PEN_FILE" --repo "$PWD" --model "$MODEL" --effort "$effort" --enable-preview --prompt "$prompt"
	else
		pen --in "$PEN_FILE" --out "$PEN_FILE" --repo "$PWD" --model "$MODEL" --effort "$effort" --enable-preview --prompt "$prompt"
	fi
	echo "── tour $tour terminé — aperçu dans ~/.pencil/latest-preview.png"
}

if [[ $# -gt 0 ]]; then
	run "$1"
	exit 0
fi

for tour in 00 01 02 03 04 05 06 07 08; do
	run "$tour"
done
