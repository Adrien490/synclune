#!/usr/bin/env bash
# Séquence complète de la landing Synclune.
# Chaque tour repart du .pen produit par le précédent.
#
# Usage :  ./landing.sh            # 00 puis 01a, et S'ARRÊTE : la piste retenue est un
#                                  # arbitrage d'Adrien et de Léane, pas un tour de plus
#          ./landing.sh suite      # 01 → 08, une fois la piste inscrite dans ETAT.md
#          ./landing.sh 03         # un seul tour, sur le fichier existant
#          PEN_FORCE=1 ./landing.sh 09   # forcer un tour one-shot (09 et 10)
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
		01a) echo xhigh ;; # divergence — trois pistes de premier écran ; le tour qui décide de tout
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
			echo "tour inconnu : « $1 » — attendu : 00, 01a, 01 à 10, sur deux chiffres (03, pas 3)" >&2
			return 1
			;;
	esac
}

# Les tours 09 et 10 sont ONE-SHOT : leurs prompts référencent des ids de nœuds et des
# mesures (plis, bounds) d'une exécution précise — « j9QGj », « Trd6e », « fb42R ». Sur un
# .pen régénéré, ces ids ne désignent rien et le tour travaille dans le vide sans erreur.
# Constaté à l'audit du dossier du 2026-08-19 : le script les acceptait sans broncher.
guard_one_shot() {
	case "$1" in
		09 | 10)
			if [[ "${PEN_FORCE:-}" != 1 ]]; then
				echo "tour $1 : ONE-SHOT — son prompt cite des ids de nœuds d'une exécution précise (README § Rejouable)." >&2
				echo "sur un fichier régénéré il ne trouvera rien. « PEN_FORCE=1 ./landing.sh $1 » pour passer outre." >&2
				exit 1
			fi
			echo "⚠ tour $1 forcé (PEN_FORCE=1) — vérifie que les ids cités par le prompt existent encore." >&2
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
	guard_one_shot "$tour"
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

	# Ce qui relie les tours : chaque `pen` est un processus neuf. On injecte l'ÉTAT
	# COURANT (ETAT.md, réécrit à chaque passe) plus les DEUX dernières entrées du
	# carnet — et non plus le carnet entier. Mesuré à l'audit du 2026-08-19 : NOTES.md
	# pesait 66 Ko contre 17 Ko de contexte de marque, soit trois quarts du prompt en
	# historique. Un tour qui lit surtout le passé le reproduit. Le carnet complet reste
	# lisible par l'agent : `--repo` lui donne le dossier, la conduite lui dit d'y aller
	# en cas de doute.
	if [[ -f ETAT.md ]]; then
		notes="$(printf '\n\n---\n\n# ETAT.md — état courant de la maquette\n\n%s' "$(cat ETAT.md)")"
	fi
	if [[ -f NOTES.md ]]; then
		# Depuis la 2ᵉ entrée en partant de la fin : « ## » ouvre une entrée de carnet.
		local from
		from="$(grep -n '^## ' NOTES.md | tail -2 | head -1 | cut -d: -f1)"
		if [[ -n "$from" ]]; then
			notes+="$(printf '\n\n---\n\n# NOTES.md — les deux dernières entrées (le carnet complet est dans le dossier)\n\n%s' "$(tail -n "+${from}" NOTES.md)")"
		fi
	fi

	# La checklist commune ne vaut que pour les tours de SECTION : 00, 01a et 07 à 10
	# portent chacun leur propre bloc de sortie. Le glob `0[1-6]` ne matche que deux
	# caractères — « 01a » en est donc exclu, c'est voulu (ses frames n'ont ni
	# placeholder photo ni contrainte de pli).
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

# `suite` joue 01 → 08 : c'est la reprise APRÈS l'arbitrage de la divergence. 09 et 10
# restent one-shot (cf. guard_one_shot) : les rejouer sur un fichier neuf demande
# PEN_FORCE=1, tour par tour, en connaissance de cause.
if [[ "${1:-}" == "suite" ]]; then
	# La fourche du tour 1a se solde AVANT de payer le tour le plus cher de la série.
	# Le tour 1 sait refuser tout seul (01-hero.md), mais son refus arrive après avoir
	# payé l'amorce d'un tour xhigh — ce grep, lui, est gratuit. Ligne absente = rejeu
	# sans divergence (cas prévu par 01-hero.md), on laisse passer.
	if grep -q 'Piste retenue du tour 1a.*EN ATTENTE' ETAT.md 2>/dev/null; then
		echo "la ligne « Piste retenue du tour 1a » d'ETAT.md dit encore EN ATTENTE — l'arbitrage n'est pas pris." >&2
		echo "inscris la piste retenue (a/b/c + greffes), puis relance :  ./landing.sh suite" >&2
		exit 1
	fi
	for tour in 01 02 03 04 05 06 07 08; do
		run "$tour"
	done
	exit 0
fi

if [[ $# -gt 0 ]]; then
	run "$1"
	exit 0
fi

# La séquence sans argument s'arrête APRÈS la divergence, à dessein : 01a produit trois
# pistes et 01a-divergence.md est formel — l'agent ne choisit pas, la piste retenue est
# un arbitrage d'Adrien et de Léane. Enchaîner 01 ici ferait payer le tour le plus cher
# de la série (xhigh) avant que quiconque ait vu les pistes. Constaté à la contre-visite
# du 2026-08-19 (AUDIT-DOSSIER-2026-08-19b.md).
for tour in 00 01a; do
	run "$tour"
done
cat >&2 <<'EOF'
── séquence arrêtée après la divergence — c'est voulu.
   1. Regarde les trois pistes : apercus/tour-01a.png (et la recommandation de l'agent
      dans son rapport).
   2. Inscris la piste retenue dans ETAT.md, section « Arbitrages » (une ligne :
      « Piste retenue du tour 1a : <a|b|c>, greffes : … »).
   3. Relance :  ./landing.sh suite     (01 → 08)
EOF
