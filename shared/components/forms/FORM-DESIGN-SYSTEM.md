# Design System - Formulaires Synclune

## Principes fondamentaux

### 1. Flux continu
- **Pas de titres de sections** - Les formulaires utilisent un flux continu sans interruption
- **Pas de separateurs** - Les champs s'enchainent naturellement
- L'utilisateur reste concentre sur la saisie

### 2. Largeur
- **100% de la largeur disponible** - Pas de max-width restrictif sur le formulaire
- Le conteneur parent gere les marges laterales

### 3. Espacement
```
space-y-6  Entre les champs (24px)
space-y-2  Entre label et helper text (8px)
gap-6      Pour les grilles 2 colonnes
```

---

## Structure type d'un formulaire

```tsx
<form className="space-y-6">
  {/* Erreurs formulaire */}
  <form.FormErrorDisplay />

  {/* Note champs requis */}
  <RequiredFieldsNote />

  {/* Champs en flux continu */}
  <form.AppField name="field1">
    {(field) => <field.InputField label="..." />}
  </form.AppField>

  <form.AppField name="field2">
    {(field) => <field.TextareaField label="..." rows={4} />}
  </form.AppField>

  {/* Grille pour champs courts */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <form.AppField name="firstName">...</form.AppField>
    <form.AppField name="lastName">...</form.AppField>
  </div>

  {/* Submit sticky mobile */}
  <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 py-4 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:py-4 sm:mx-0 flex justify-center">
    <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-[220px]">
      Envoyer
    </Button>
  </div>
</form>
```

---

## Composants disponibles

### Champs de base
| Composant | Usage |
|-----------|-------|
| `InputField` | Texte, email, tel, number |
| `TextareaField` | Texte long (rows={4} par defaut) |
| `SelectField` | Liste deroulante |
| `CheckboxField` | Case a cocher unique |
| `RadioGroupField` | Choix exclusif |
| `PasswordInputField` | Mot de passe avec toggle |

### Champs avec addons
| Composant | Usage |
|-----------|-------|
| `InputGroupField` | Input avec prefixe/suffixe |
| `TextareaGroupField` | Textarea avec addon |

### Labels et erreurs
| Composant | Usage |
|-----------|-------|
| `FieldLabel` | Label avec indicateur requis/optionnel et tooltip |
| `FormErrorDisplay` | Erreurs niveau formulaire |

### Layout
| Composant | Usage |
|-----------|-------|
| `FormLayout` | Container avec space-y-4 md:space-y-6 |
| `FormFooter` | Footer sticky avec boutons |

---

## Regles UX

### Touch targets (mobile)
- **Minimum 44px de hauteur** pour tous les elements interactifs
- Boutons: `py-2.5` minimum
- Pills/chips: `px-4 py-2.5`

### Textes
- Labels: `text-sm font-medium`
- Helper text: `text-sm text-muted-foreground`
- Erreurs: `text-sm text-destructive`

### Pills de selection (type de produit, tags, etc.)
```tsx
className={cn(
  "px-4 py-2.5 rounded-full text-sm font-medium transition-all",
  "border hover:border-primary/50 hover:shadow-sm",
  isSelected
    ? "bg-primary text-primary-foreground border-primary shadow-sm"
    : "bg-background text-muted-foreground border-border hover:text-foreground"
)}
```

### Bouton submit sticky (mobile)
```tsx
<div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 py-4 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:py-4 sm:mx-0 flex justify-center">
  <Button size="lg" className="w-full sm:w-auto sm:min-w-[220px]">
    ...
  </Button>
</div>
```

---

## Grilles responsives

### 2 colonnes pour champs courts
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Prenom / Nom */}
  {/* Ville / Code postal */}
</div>
```

### 3 colonnes (admin uniquement)
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Champs admin */}
</div>
```

---

## Anti-patterns (a eviter)

- **Titres de sections** - Coupent le flux de saisie
- **Separateurs entre champs** - Ajoutent du bruit visuel
- **max-width restrictif** - Le formulaire doit utiliser l'espace disponible
- **Textes d'aide trop petits** - Minimum `text-sm` pour l'accessibilite
- **Touch targets < 44px** - Frustrant sur mobile
