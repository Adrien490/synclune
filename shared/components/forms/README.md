# Form Components

Ce dossier contient l'implémentation des formulaires basée sur **TanStack Form** avec composition de hooks personnalisés.

## Structure

```
shared/components/forms/
├── index.tsx                 # Point d'entrée principal - exporte useAppForm
├── checkbox-field.tsx        # Champ de type checkbox
├── input-field.tsx           # Champ input générique (texte, nombre, email, etc.)
├── input-group-field.tsx     # Champ input avec addon (prefix/suffix)
├── select-field.tsx          # Champ de sélection
├── radio-group-field.tsx     # Groupe de boutons radio
├── textarea-field.tsx        # Zone de texte multiligne
├── textarea-group-field.tsx  # Zone de texte avec addon
├── form-error-display.tsx    # Affichage des erreurs globales de formulaire
├── field-label.tsx           # Label de champ avec support optionnel/requis
├── form-footer.tsx           # Footer de formulaire avec boutons
├── form-layout.tsx           # Layout responsive pour formulaires
└── form-section.tsx          # Section de formulaire avec titre
```

## API principale

### `useAppForm`

Hook personnalisé pour créer un formulaire TanStack Form avec pré-configuration des composants.

```tsx
import { useAppForm } from "@/shared/components/forms";

function MyForm() {
	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			// Logique de soumission
		},
	});

	return (
		<form onSubmit={() => form.handleSubmit()}>
			<form.AppField name="email">
				{(field) => (
					<field.InputField
						label="Email"
						type="email"
						placeholder="votre@email.com"
						required
					/>
				)}
			</form.AppField>

			<form.AppField name="password">
				{(field) => (
					<field.InputField label="Mot de passe" type="password" required />
				)}
			</form.AppField>

			<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
				{([canSubmit, isSubmitting]) => (
					<Button type="submit" disabled={!canSubmit || isSubmitting}>
						{isSubmitting ? "Envoi..." : "Se connecter"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
```

## Composants de champs disponibles

Tous les composants de champs utilisent `useFieldContext` et sont pré-configurés dans `fieldComponents`.

### `InputField`

Champ input générique avec support de plusieurs types. Inclut automatiquement le label.

```tsx
<form.AppField name="email">
	{(field) => (
		<field.InputField
			label="Email"
			type="email"
			placeholder="exemple@email.com"
			required
			disabled={false}
		/>
	)}
</form.AppField>
```

**Props:**

- `label?: string` - Label du champ
- `type?: string` - Type d'input (text, email, password, number, etc.)
- `placeholder?: string`
- `required?: boolean`
- `disabled?: boolean`
- `min?: number` - Pour type="number"
- `step?: number` - Pour type="number"

**Note pour les nombres:** Les champs vides retournent `null`, ce qui permet de distinguer "pas de valeur" de "zéro". La valeur `0` peut être saisie et affichée correctement.

### `InputGroupField`

Champ input avec addon (prefix ou suffix). N'inclut **pas** de label - utilisez `FieldLabel` si nécessaire.

```tsx
<form.AppField name="price">
	{(field) => (
		<field.InputGroupField
			type="number"
			placeholder="0.00"
			min={0}
			step={0.01}
		>
			<InputGroupAddon position="end">€</InputGroupAddon>
		</field.InputGroupField>
	)}
</form.AppField>
```

**Props:**

- `children?: ReactNode` - Addon (InputGroupAddon) à afficher
- `type?: string` - Type d'input
- `placeholder?: string`
- `required?: boolean`
- `disabled?: boolean`
- `min?: number`
- `max?: number`
- `step?: number`

### `SelectField`

Champ de sélection avec support de typage générique.

```tsx
<form.AppField name="country">
	{(field) => (
		<field.SelectField
			label="Pays"
			placeholder="Sélectionner..."
			options={[
				{ value: "fr", label: "France" },
				{ value: "be", label: "Belgique" },
			]}
			required
			clearable // Permet d'effacer la sélection
		/>
	)}
</form.AppField>
```

**Props:**

- `label?: string`
- `placeholder?: string`
- `options: { value: T; label: string }[]`
- `required?: boolean`
- `disabled?: boolean`
- `clearable?: boolean` - Affiche un bouton pour effacer la sélection
- `renderOption?: (option) => ReactNode` - Rendu personnalisé des options
- `renderValue?: (value) => ReactNode` - Rendu personnalisé de la valeur sélectionnée

### `CheckboxField`

Case à cocher. Inclut automatiquement le label.

```tsx
<form.AppField name="terms">
	{(field) => <field.CheckboxField label="J'accepte les conditions" required />}
</form.AppField>
```

### `RadioGroupField`

Groupe de boutons radio.

```tsx
<form.AppField name="status">
	{(field) => (
		<field.RadioGroupField
			label="Statut"
			options={[
				{ value: "DRAFT", label: "Brouillon" },
				{ value: "PUBLIC", label: "Public" },
			]}
		/>
	)}
</form.AppField>
```

### `TextareaField`

Zone de texte multiligne. Inclut automatiquement le label.

```tsx
<form.AppField name="description">
	{(field) => (
		<field.TextareaField
			label="Description"
			placeholder="Décrivez votre produit..."
			rows={4}
		/>
	)}
</form.AppField>
```

### `TextareaGroupField`

Zone de texte avec addon. N'inclut **pas** de label.

```tsx
<form.AppField name="notes">
	{(field) => (
		<field.TextareaGroupField
			placeholder="Notes..."
			rows={3}
		/>
	)}
</form.AppField>
```

## Composants de formulaire

### `FormErrorDisplay`

Affiche les erreurs globales du formulaire (erreurs `onSubmit`).

```tsx
<form action={action}>
	<form.FormErrorDisplay />
	{/* Champs du formulaire */}
</form>
```

## Composants UI helpers

Ces composants sont disponibles pour la mise en page et l'organisation.

### `FormLayout`

Layout responsive pour organiser les champs en colonnes.

```tsx
import { FormLayout } from "@/shared/components/forms";

<FormLayout cols={2}>
	<form.AppField name="firstName">
		{(field) => <field.InputField label="Prénom" />}
	</form.AppField>

	<form.AppField name="lastName">
		{(field) => <field.InputField label="Nom" />}
	</form.AppField>
</FormLayout>;
```

**Props:**

- `cols?: 1 | 2 | 3 | 4` - Nombre de colonnes (défaut: 2)
- `className?: string`

### `FormSection`

Section de formulaire avec titre et description.

```tsx
import { FormSection } from "@/shared/components/forms";

<FormSection
	title="Informations personnelles"
	description="Renseignez vos informations de contact"
>
	{/* Champs de la section */}
</FormSection>;
```

### `FormFooter`

Footer de formulaire avec indication des champs requis et boutons.

```tsx
import { FormFooter } from "@/shared/components/forms";

<FormFooter
	isPending={isPending}
	cancelHref="/retour"
	showRequiredHint
/>;
```

### `FieldLabel`

Label de champ avec support optionnel/requis et tooltip.

```tsx
import { FieldLabel } from "@/shared/components/forms";

<FieldLabel htmlFor="email" required>
	Email
</FieldLabel>

<FieldLabel htmlFor="phone" optional>
	Téléphone
</FieldLabel>

<FieldLabel htmlFor="code" tooltip="Le code à 6 chiffres">
	Code de vérification
</FieldLabel>
```

## Validation

TanStack Form supporte plusieurs stratégies de validation.

### Validation inline

```tsx
<form.AppField
	name="email"
	validators={{
		onChange: ({ value }) => {
			if (!value.includes("@")) {
				return "Email invalide";
			}
		},
	}}
>
	{(field) => <field.InputField label="Email" />}
</form.AppField>
```

### Validation asynchrone

```tsx
<form.AppField
	name="username"
	validators={{
		onChangeAsync: async ({ value }) => {
			const exists = await checkUsernameExists(value);
			if (exists) {
				return "Ce nom d'utilisateur est déjà pris";
			}
		},
	}}
>
	{(field) => <field.InputField label="Nom d'utilisateur" />}
</form.AppField>
```

### Validation inter-champs

```tsx
<form.AppField
	name="confirmPassword"
	validators={{
		onChangeListenTo: ["password"],
		onChange: ({ value, fieldApi }) => {
			if (value !== fieldApi.form.getFieldValue("password")) {
				return "Les mots de passe ne correspondent pas";
			}
		},
	}}
>
	{(field) => <field.InputField label="Confirmer" type="password" />}
</form.AppField>
```

## Intégration avec Server Actions

Pour intégrer avec Next.js Server Actions, utilisez `mergeForm` pour synchroniser les erreurs serveur :

```tsx
import { useAppForm } from "@/shared/components/forms";
import { mergeForm, useTransform } from "@tanstack/react-form-nextjs";

function MyForm() {
	const [state, action, isPending] = useActionState(myServerAction, undefined);

	const form = useAppForm({
		defaultValues: { name: "" },
		transform: useTransform(
			(baseForm) => mergeForm(baseForm, (state as unknown) ?? {}),
			[state]
		),
	});

	return (
		<form action={action} onSubmit={() => form.handleSubmit()}>
			{/* ... */}
		</form>
	);
}
```

## Constantes de validation

Utilisez les constantes centralisées pour la validation :

```tsx
import { EMAIL_REGEX, isValidEmail } from "@/shared/constants/validation";

validators={{
	onChange: ({ value }) => {
		if (!EMAIL_REGEX.test(value)) {
			return "Format d'email invalide";
		}
	},
}}
```

## Bonnes pratiques

1. **Utilisez `useAppForm`** pour bénéficier des composants pré-configurés
2. **Utilisez `form.AppField`** pour accéder aux composants de champs (`field.InputField`, etc.)
3. **Utilisez `form.Subscribe`** pour écouter l'état du formulaire (canSubmit, isSubmitting)
4. **Validez au bon moment**: `onChange` pour les feedbacks immédiats, `onBlur` après la saisie, `onSubmit` pour les validations globales
5. **Utilisez `mergeForm`** pour synchroniser les erreurs serveur avec le formulaire

## Références

- [TanStack Form - Documentation](https://tanstack.com/form/latest/docs/overview)
- [TanStack Form - Validation](https://tanstack.com/form/latest/docs/framework/react/guides/validation)
