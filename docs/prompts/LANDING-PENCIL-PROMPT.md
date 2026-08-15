# Landing Synclune — la séquence Pencil

> Point d'entrée. Le prompt monolithique de la première version a été remplacé par une **séquence de
> huit tours**, conformément à `LANDING-PENCIL-PROMPT-AUDIT.md` (9,5 → 20/20).
> Croisée avec `docs/LANDING-BEST-PRACTICES.md` et `docs/BRAND-DA.md`.

## Pourquoi une séquence et pas un prompt

Trois raisons, toutes documentées par l'éditeur de Pencil :

- **« Plusieurs demandes non liées dans un seul prompt » est un anti-pattern explicite.** Six
  sections × deux viewports en un tour, c'est le mode d'échec connu : hero soigné, FAQ bâclée.
- **La méthode native est itérative** : large → structure → détails → polish, avec vérification à
  chaque palier.
- **On cible une frame par son nom.** Le nommage est l'adressage — d'où le tour 0, qui crée les
  frames vides avant que quoi que ce soit ne soit dessiné.

## Les fichiers

| Fichier                       | Rôle                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `landing/_conduite.md`        | **Comment l'agent se comporte** : autonomie, périmètre, preuves, le carnet |
| `landing/synclune-univers.md` | Le contexte de marque                                                      |
| `landing/synclune-systeme.md` | Couleurs, typo, espacement, grille, stratégie d'images                     |
| `landing/_checklist.md`       | La checklist de sortie, collée à la fin de chaque tour                     |
| `landing/00-bootstrap.md`     | Découverte Pencil + import du site + système + composants + frames vides   |
| `landing/01-hero.md` … `07-…` | Un tour par section                                                        |
| `landing/landing.sh`          | La séquence rejouable                                                      |
| `landing/NOTES.md`            | **Généré.** Le carnet que les tours se passent — ne pas le versionner      |

Les trois premiers sont concaténés en tête de **chaque** tour ; le carnet y est ajouté dès qu'il
existe. Un tour ne connaît donc que : la conduite, la marque, le système, sa propre section, la
checklist, et les décisions des tours précédents.

## L'ordre des tours, et pourquoi celui-là

Tous les tours tournent sur **`claude-fable-5`** (surcharge : `PEN_MODEL=…`). Le modèle étant
constant, le levier de coût et de latence est l'**effort**, pas le tier :

| #   | Tour                        | Effort | Pourquoi ici                                    |
| --- | --------------------------- | ------ | ----------------------------------------------- |
| 0   | Bootstrap                   | xhigh  | Rien ne peut être cohérent avant lui            |
| 1   | Hero                        | xhigh  | ~100 % de l'audience, le plus cher à refaire    |
| 2   | Les dernières créations     | high   | La section qui convertit                        |
| 3   | Collections                 | high   | Orientation                                     |
| 4   | Pour tous les goûts (types) | medium | Le plus mécanique                               |
| 5   | L'atelier                   | high   | C'est de la copie autant que de la mise en page |
| 6   | FAQ et réassurance          | medium | Réassurance chiffrée                            |
| 7   | Carte de partage + cookies  | medium | Les deux écrans vus **avant** le hero           |

## Importer la page existante — oui, et c'est fait au tour 0

Pencil sait charger une page réelle et **la reproduire en calques éditables** (`browser` →
`load-page` puis `import-to-canvas`). Chaque nœud importé porte dans son champ `context` le nom du
composant de code d'où il vient — c'est ce qui rendra le retour design → code praticable.

Ce n'est **pas automatique** : il faut le demander, et le tour 0 le fait pour la **barre haute, la
barre basse mobile et le pied de page**. C'est aussi **nécessaire** — sans ça l'agent redessine de
mémoire une chrome qui existe déjà, et le résultat ne correspond à aucun composant du dépôt.

Ce qu'il faut de ton côté : **le serveur de dev doit tourner** (`pnpm dev`). Si le port n'est pas
3000 : `SITE_URL=http://localhost:3001 ./landing.sh`. Si rien ne répond, le tour 0 dessine la chrome
d'après sa description et te le signale — ce n'est pas bloquant.

⚠️ **On importe la structure, pas la direction artistique.** Le site actuel est l'état d'avant la
refonte ; l'import sert à récupérer l'ossature et les libellés, pas les partis pris visuels.

Deux usages voisins, à connaître : `return-screenshot` referme la boucle (charger la page générée,
la regarder, corriger) et `export_html` réexporte des frames en HTML + Tailwind.

## Lancer

```bash
pnpm add -g @pen.dev/cli   # ⚠️ PAS @pencil.dev/cli, qui est déprécié
pen login                  # interactif — à lancer toi-même
pnpm dev                   # dans un autre terminal : l'import du tour 0 en dépend

cd docs/prompts/landing
./landing.sh          # toute la séquence
./landing.sh 03       # un seul tour, sur le .pen existant
```

**Deux chemins, pas un :**

| Chemin                                    | Ce que ça fait                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `pen --out … --prompt …` (le script)      | **Headless.** Le CLI ouvre son propre éditeur, dessine, écrit le `.pen` sur disque |
| `pen interactive --app desktop`           | **Connecté à l'app ouverte.** Les appels MCP frappent le fichier ouvert à l'écran |

Le serveur MCP branché ici emprunte le second chemin : il exige donc qu'un `.pen` soit **ouvert dans
l'éditeur**, sinon il répond `A file needs to be open in the editor`.

Modèles disponibles (`pen --list-models`) : `claude-opus-5` (défaut) · `claude-fable-5` ·
`claude-opus-4-8/4-7/4-6` · `claude-sonnet-5` · `claude-sonnet-4-6` · `claude-haiku-4-5`.
`--agent codex|gemini` existe aussi. `--effort <level>` règle la profondeur de raisonnement.

⚠️ **Relis le canvas entre deux tours.** La séquence est scriptée pour être rejouable, pas pour être
lancée sans regarder : chaque tour se termine par une checklist que l'agent doit te rapporter.

## Le budget d'attention, qui gouverne tout le reste

~50 % des visiteuses ne scrollent pas du tout · ~25-30 % atteignent la section 3 · **moins de 15 %
la section 5**. Chaque section après la troisième coûte un **ordre de grandeur** d'audience.

Six sections, c'est un choix assumé — pas une ignorance du chiffre. Il a une conséquence : les
sections 4, 5 et 6 doivent être **légères et scannables**, et **aucune information critique ne peut
vivre uniquement là-bas**. Si le franco de port ne vit qu'en FAQ, il ne vit nulle part.

## Ce qui reste à trancher avec Léane

- **Quatre collections ou neuf ?** Le catalogue en base en a 4 (Jardin fantastique, Ciel cosmique,
  Arc-en-ciel liquide, Tableaux à porter) ; la boutique Etsy en a 9. Le tour 3 demande une
  composition qui survit aux deux, mais le choix change la section.
- **La liste de photos.** Les calques `photo/*` produits par la séquence sont la checklist de
  shooting. Autant qu'elle soit réaliste avant d'être figée.
- **`or-encre` (`#896e2c`)** n'existe pas encore comme token dans `app/globals.css`. Si le design le
  retient, il faut le créer côté code.
