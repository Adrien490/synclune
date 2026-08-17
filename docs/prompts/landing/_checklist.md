# Checklist de sortie

> Bloc collé à la fin de chaque tour de **section** (tours 1 à 6 — les tours 0 et 7 à 10 portent
> chacun leur propre bloc de sortie). C'est ce qui sépare « l'agent a dessiné » de
> « le design tient les contraintes ».
>
> Tous les points ci-dessous sont **vérifiables depuis le fichier** — capture, lecture de nœud ou
> calcul sur les variables. Aucun ne se coche à l'estime.

```
Termine par get_screenshot des frames de ce tour, puis vérifie et rapporte point par point.
Chaque coche s'appuie sur un résultat d'outil de cette session : si tu n'as pas vérifié, écris
"non vérifié" plutôt que de cocher.

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
Puis ajoute ton entrée à NOTES.md.
```
