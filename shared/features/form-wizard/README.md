# Form Wizard

Système de formulaire multi-étapes accessible et responsive pour React/Next.js.

## Caractéristiques

- **Multi-step navigation** - Navigation avant/arrière avec validation par étape
- **Responsive** - Mode wizard (mobile) ou affichage complet (desktop)
- **Accessible** - WCAG compliant avec focus management et screen reader support
- **Persistance** - Sauvegarde optionnelle de l'étape en sessionStorage
- **Adapter pattern** - Compatible avec n'importe quelle librairie de formulaires
- **Animations** - Transitions fluides avec Framer Motion

## Installation rapide

```tsx
import {
  WizardProvider,
  useFormWizard,
  WizardStepContainer,
  WizardNavigation,
  WizardProgress,
  createTanStackFormAdapter,
  type WizardStep,
} from "@/shared/features/form-wizard"
```

## Usage basique

### 1. Définir les étapes

```tsx
const STEPS: WizardStep[] = [
  {
    id: "personal",
    label: "Informations personnelles",
    fields: ["firstName", "lastName", "email"],
  },
  {
    id: "address",
    label: "Adresse",
    fields: ["street", "city", "postalCode"],
  },
  {
    id: "confirmation",
    label: "Confirmation",
    fields: [],
  },
]
```

### 2. Wrapper avec le Provider

```tsx
export function MyForm() {
  return (
    <WizardProvider totalSteps={STEPS.length} desktopMode="all">
      <FormContent />
    </WizardProvider>
  )
}
```

### 3. Utiliser le hook principal

```tsx
function FormContent() {
  const form = useAppForm({
    defaultValues: { firstName: "", lastName: "", email: "" },
  })

  const wizard = useFormWizard({
    steps: STEPS,
    form: createTanStackFormAdapter(form),
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <WizardProgress
        steps={wizard.visibleSteps}
        currentStep={wizard.currentStep}
        completedSteps={wizard.completedSteps}
        onStepClick={wizard.goToStep}
        getStepErrors={wizard.getStepErrors}
      />

      {STEPS.map((step, index) => (
        <WizardStepContainer
          key={step.id}
          step={step}
          stepIndex={index}
          onRegisterRef={wizard.registerStepRef}
        >
          {/* Contenu de l'étape */}
        </WizardStepContainer>
      ))}

      <WizardNavigation
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        onPrevious={wizard.goPrevious}
        onNext={wizard.goNext}
        isValidating={wizard.isValidating}
      />
    </form>
  )
}
```

## API Reference

### WizardProvider

Provider de contexte pour l'état du wizard.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `totalSteps` | `number` | **required** | Nombre total d'étapes |
| `desktopMode` | `"wizard" \| "all"` | `"all"` | Mode d'affichage sur desktop |
| `initialStep` | `number` | `0` | Étape initiale |

### useFormWizard

Hook principal qui orchestre toutes les fonctionnalités.

#### Options

```typescript
interface UseFormWizardOptions {
  steps: WizardStep[]              // Configuration des étapes
  form: FormLike                   // Adapter du formulaire
  onStepChange?: (step, direction) => void  // Callback changement d'étape
  messages?: WizardMessages        // Messages personnalisés
  persist?: boolean | string       // Persistance sessionStorage
  onValidationError?: (message: string) => void  // Handler d'erreur personnalisé
}
```

#### Retour

| Propriété | Type | Description |
|-----------|------|-------------|
| **État** | | |
| `currentStep` | `number` | Index de l'étape courante |
| `totalSteps` | `number` | Nombre total d'étapes |
| `isFirstStep` | `boolean` | Est à la première étape |
| `isLastStep` | `boolean` | Est à la dernière étape |
| `isValidating` | `boolean` | Validation en cours |
| **Navigation** | | |
| `goToStep(step)` | `Promise<boolean>` | Naviguer vers une étape |
| `goNext()` | `Promise<boolean>` | Étape suivante (avec validation) |
| `goPrevious()` | `void` | Étape précédente (sans validation) |
| `resetWizard()` | `void` | Réinitialiser le wizard |
| **Validation** | | |
| `validateCurrentStep()` | `Promise<boolean>` | Valider l'étape courante |
| `isStepValid(index)` | `boolean` | Vérifier si une étape est valide |
| `hasStepErrors(index)` | `boolean` | Vérifier si une étape a des erreurs |
| `getStepErrors(index)` | `string[]` | Obtenir les erreurs d'une étape |
| `scrollToFirstError()` | `void` | Scroller vers la première erreur |
| **Progression** | | |
| `completedSteps` | `Set<number>` | Étapes complétées |
| `progress` | `number` | Pourcentage de progression (0-100) |
| **Mode** | | |
| `isMobile` | `boolean` | Détection mobile |
| `effectiveMode` | `"wizard" \| "all"` | Mode effectif calculé |
| **Accessibilité** | | |
| `registerStepRef` | `(index, el) => void` | Enregistrer élément d'étape |
| `announcement` | `string` | Annonce screen reader |

### WizardStep

Configuration d'une étape.

```typescript
interface WizardStep {
  id: string              // Identifiant unique
  label: string           // Label affiché
  description?: string    // Description optionnelle
  icon?: ReactNode        // Icône optionnelle
  fields: string[]        // Champs à valider pour cette étape
  optional?: boolean      // Étape optionnelle (peut être sautée)
  condition?: () => boolean  // Condition d'affichage
  disabled?: boolean      // Étape désactivée (non navigable)
}
```

### WizardProgress

Indicateur de progression avec 3 variantes.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `steps` | `WizardStep[]` | **required** | Configuration des étapes |
| `currentStep` | `number` | **required** | Étape courante |
| `completedSteps` | `Set<number>` | **required** | Étapes complétées |
| `onStepClick` | `(step) => void` | - | Handler de clic sur étape |
| `variant` | `"progress-bar" \| "dots" \| "stepper"` | `"progress-bar"` | Style d'affichage |
| `getStepErrors` | `(index) => string[]` | - | Fonction pour obtenir les erreurs |
| `enableKeyboardNav` | `boolean` | `true` | Navigation clavier (← →) |

### WizardNavigation

Boutons de navigation Précédent/Suivant/Enregistrer.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isFirstStep` | `boolean` | **required** | Masque le bouton Précédent |
| `isLastStep` | `boolean` | **required** | Affiche Enregistrer au lieu de Suivant |
| `onPrevious` | `() => void` | **required** | Handler bouton Précédent |
| `onNext` | `() => Promise<boolean>` | **required** | Handler bouton Suivant |
| `isSubmitting` | `boolean` | `false` | État de soumission |
| `isValidating` | `boolean` | `false` | État de validation |
| `previousLabel` | `string` | `"Précédent"` | Label personnalisé |
| `nextLabel` | `string` | `"Suivant"` | Label personnalisé |
| `submitLabel` | `string` | `"Enregistrer"` | Label personnalisé |

### WizardStepContainer

Container pour le contenu d'une étape.

| Prop | Type | Description |
|------|------|-------------|
| `step` | `WizardStep` | Configuration de l'étape |
| `stepIndex` | `number` | Index de l'étape |
| `children` | `ReactNode` | Contenu de l'étape |
| `onRegisterRef` | `(index, el) => void` | Callback pour enregistrer la ref |

**Note importante**: Ce composant garde toujours le contenu dans le DOM (même caché) pour préserver l'état du formulaire. C'est essentiel pour que FormData fonctionne avec les Server Actions.

### WizardMobileShell

Wrapper optimisé pour mobile avec swipe et navigation sticky.

| Prop | Type | Description |
|------|------|-------------|
| `steps` | `WizardStep[]` | Configuration des étapes |
| `currentStep` | `number` | Étape courante |
| `completedSteps` | `Set<number>` | Étapes complétées |
| `onStepClick` | `(step) => Promise<boolean>` | Handler de clic sur étape |
| `isFirstStep` | `boolean` | État de navigation |
| `isLastStep` | `boolean` | État de navigation |
| `onPrevious` | `() => void` | Handler Précédent |
| `onNext` | `() => Promise<boolean>` | Handler Suivant |
| `title` | `string` | Titre optionnel |
| `getStepErrors` | `(index) => string[]` | Fonction erreurs |

**Fonctionnalités**:
- Swipe gauche → étape suivante (avec validation)
- Swipe droit → étape précédente (sans validation)
- Header sticky avec progression (variante dots)
- Footer sticky avec boutons de navigation

## Exemples avancés

### Étapes conditionnelles

```tsx
const STEPS: WizardStep[] = [
  {
    id: "type",
    label: "Type de compte",
    fields: ["accountType"],
  },
  {
    id: "business",
    label: "Informations entreprise",
    fields: ["companyName", "siret"],
    condition: () => selectedType === "business", // Affiché si business
  },
  {
    id: "personal",
    label: "Informations personnelles",
    fields: ["firstName", "lastName"],
    condition: () => selectedType === "personal", // Affiché si personal
  },
]
```

### Avec persistance

```tsx
const wizard = useFormWizard({
  steps: STEPS,
  form: createTanStackFormAdapter(form),
  persist: "my-form-wizard", // ID unique pour ce wizard
})

// L'étape courante est sauvegardée en sessionStorage
// et restaurée automatiquement au chargement
```

### Handler d'erreur personnalisé

```tsx
const wizard = useFormWizard({
  steps: STEPS,
  form: createTanStackFormAdapter(form),
  onValidationError: (message) => {
    // Utiliser votre propre système de notification
    myCustomToast.error(message)
  },
})
```

### Mode responsive complet

```tsx
function MyForm() {
  const wizard = useFormWizard({ steps: STEPS, form: adapter })

  // Mobile: wrapper avec swipe
  if (wizard.effectiveMode === "wizard") {
    return (
      <WizardMobileShell
        steps={wizard.visibleSteps}
        currentStep={wizard.currentStep}
        completedSteps={wizard.completedSteps}
        onStepClick={wizard.goToStep}
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        onPrevious={wizard.goPrevious}
        onNext={wizard.goNext}
        getStepErrors={wizard.getStepErrors}
      >
        {renderStepContent(wizard.currentStep)}
      </WizardMobileShell>
    )
  }

  // Desktop: toutes les sections visibles
  return (
    <div>
      {STEPS.map((step, index) => (
        <section key={step.id}>
          <h2>{step.label}</h2>
          {renderStepContent(index)}
        </section>
      ))}
    </div>
  )
}
```

## Accessibilité

Le form-wizard est conçu pour être pleinement accessible:

- **Focus management**: Focus automatique sur le premier champ à chaque changement d'étape
- **Screen readers**: Annonces automatiques via `aria-live` regions
- **Keyboard navigation**: Flèches ← → sur l'indicateur de progression
- **Error handling**: Scroll automatique vers le premier champ en erreur
- **Reduced motion**: Respect de `prefers-reduced-motion`
- **Semantic HTML**: Utilisation appropriée de `<nav>`, `<ol>`, `role="tablist"`

## Intégration avec TanStack Form

L'adapter fourni permet une intégration transparente:

```tsx
import { useAppForm } from "@/shared/components/forms/form-context"
import { createTanStackFormAdapter } from "@/shared/features/form-wizard"

function MyForm() {
  const form = useAppForm({
    defaultValues: { name: "", email: "" },
    validators: { onChange: mySchema },
  })

  const wizard = useFormWizard({
    steps: STEPS,
    form: createTanStackFormAdapter(form),
  })

  // L'adapter mappe automatiquement:
  // - validateField() pour la validation par champ
  // - getFieldMeta() pour accéder aux erreurs
  // - getFieldValue() pour lire les valeurs
  // - isDirty() pour détecter les changements
}
```

## Constantes configurables

```typescript
import {
  WIZARD_MESSAGES,
  FOCUS_DELAY_MS,
  ANNOUNCEMENT_CLEAR_DELAY_MS,
  FOCUSABLE_SELECTOR,
  ERROR_FIELD_SELECTOR,
} from "@/shared/features/form-wizard"
```

| Constante | Valeur | Description |
|-----------|--------|-------------|
| `FOCUS_DELAY_MS` | `50` | Délai avant focus après changement d'étape |
| `ANNOUNCEMENT_CLEAR_DELAY_MS` | `1000` | Délai avant reset de l'annonce SR |
| `WIZARD_STORAGE_KEY_PREFIX` | `"wizard-step-"` | Préfixe clé sessionStorage |

## Messages par défaut (français)

```typescript
const WIZARD_MESSAGES = {
  validation: {
    errorsBeforeContinue: "Veuillez corriger les erreurs avant de continuer",
    stepInvalid: "Cette étape contient des erreurs",
  },
  navigation: {
    previous: "Précédent",
    next: "Suivant",
    submit: "Enregistrer",
  },
  accessibility: {
    stepOf: (current, total) => `Étape ${current} sur ${total}`,
    stepHasErrors: "contient des erreurs",
    goToStep: (label) => `Aller à ${label}`,
  },
}
```

Personnaliser via l'option `messages`:

```tsx
const wizard = useFormWizard({
  steps: STEPS,
  form: adapter,
  messages: {
    navigation: {
      submit: "Valider la commande",
    },
  },
})
```
