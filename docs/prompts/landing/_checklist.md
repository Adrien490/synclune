# Checklist de sortie

> Bloc collé à la fin de chaque tour de **section** (tours 1 à 6 — les tours 0, 1a et 7 à 10
> portent chacun leur propre bloc de sortie). C'est ce qui sépare « l'agent a dessiné » de
> « le design tient les contraintes ».
>
> ⚠️ Deux familles d'items, et elles ne se vérifient pas pareil. SYSTÈME / MISE EN PAGE / COPIE /
> CALQUES sont des **garde-fous**, vérifiables depuis le fichier — capture, lecture de nœud ou
> calcul sur les variables ; aucun ne se coche à l'estime. SIGNATURE dit ce qui doit **réussir** —
> ajouté le 2026-08-19, parce qu'une checklist qui n'attrape que l'échec produit exactement ce
> qu'elle sait mesurer : une section qui ne se trompe pas, et qui ne dit rien. Ses items sont des
> **jugements**, pas des mesures : leur vérification, c'est **l'écriture** — chaque phrase demandée
> (le geste nommé, l'idée, la justification d'une sobriété) est écrite en toutes lettres dans le
> rapport final, où Léane peut la contester. Une coche SIGNATURE sans sa phrase ne vaut rien.
> La grille complète est `_signature.md` (/20, appliquée à la page entière par les passes d'audit).

```
Termine par get_screenshot des frames de ce tour, puis vérifie et rapporte point par point.
Chaque coche s'appuie sur un résultat d'outil de cette session : si tu n'as pas vérifié, écris
"non vérifié" plutôt que de cocher.

SIGNATURE  (à répondre en premier — c'est le seul bloc qui peut te faire REFAIRE la section)
- [ ] test de substitution : remplace "Synclune" par le nom d'une autre boutique de bijoux et
      relis la section. Si elle reste vraie telle quelle, elle est tiède — refais-la avant de
      rendre la main. Le contenu catalogue (vrais noms, vraies collections) ne compte pas :
      il est vrai, il n'est pas distinctif.
- [ ] un geste que SEULE cette marque pouvait faire, nommé en une phrase avec son nœud — pas
      "une grille de cartes" mais "la frange de pampilles coupée par le pli". Un geste qu'on ne
      sait pas nommer n'existe pas.
- [ ] la section porte une IDÉE, pas seulement une mise en page : écris-la en une phrase.
      "Le catalogue pend à une chaîne, comme les bijoux" est une idée ; "une grille de 8 cartes"
      est un gabarit.
- [ ] chaque décision SOBRE de la section (aplat neutre, symétrie parfaite, blanc plutôt que
      couleur, absence de motif) porte sa justification écrite. L'audace, elle, n'a rien à
      justifier — c'est l'univers de la marque qui le pose.

SYSTÈME
- [ ] aucune valeur d'espacement ou de typo écrite en dur — tout vient des variables
- [ ] une seule couleur d'accent dans la section (rose OU or, jamais les deux)
- [ ] aucun texte ni glyphe encré en `rose` ou `or` — pour écrire : `rose-encre` / `or-encre`
      (l'encre posée SUR un aplat rose ou or, elle, passe largement)
- [ ] contraste ≥ 4,5:1 pour tout texte, ≥ 3:1 pour un trait porteur d'information
      — calcule-le depuis les hex des variables, ne l'estime pas à l'œil

MISE EN PAGE
- [ ] mobile 390 × 844 : le contenu clé de la section tient dans le budget annoncé
- [ ] le haut de la section suivante déborde sous la ligne de flottaison (pas de flèche « scroll »)
      — sans objet pour la dernière section de la page : l'écrire plutôt que cocher
- [ ] cibles tactiles ≥ 24 × 24 (plancher opposable), visées à 44-48, espacées d'au moins 8
- [ ] aucun libellé ne dépend d'une ligne unique : les boutons et liens peuvent passer sur deux
      lignes sans casser la mise en page (le texte grossit chez les visiteuses qui zooment)

COPIE
- [ ] aucun superlatif invérifiable — couper les adjectifs, garder la voix de Léane
- [ ] tutoiement partout, « je » de Léane conservé
- [ ] aucun lien d'un seul mot ; tout lien de sortie porte sa portée (« Voir les 14 créations »,
      jamais « Voir tout », jamais « Découvrir »)

CALQUES
- [ ] chaque emplacement photo est un placeholder nommé `photo/<sujet>` au ratio final
- [ ] noms de calques en français, kebab-case
- [ ] aucune frame hors de ce tour n'a été modifiée

Si un point échoue, corrige AVANT de rendre la main, et dis lequel a échoué.
Puis ajoute ton entrée à NOTES.md, et mets à jour ETAT.md si ton tour change l'état courant
(motif, accents, mesures qui font autorité, arbitrage ouvert ou soldé).

PROPOSITION  (facultatif, une par tour — cf. _conduite.md)
- [ ] si la section réclamait quelque chose que le système n'a pas, il est dessiné dans une frame
      `proposition/<tour>-<sujet>`, décrit en trois lignes au carnet, et n'a été posé NI dans les
      planches système NI dans la section.
```
