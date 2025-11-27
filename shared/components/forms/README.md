# Form Components

Ce dossier contient l'implémentation des formulaires basée sur **TanStack Form** avec composition de hooks personnalisés.

## Structure

```
shared/components/forms/
├── index.tsx                 # Point d'entrée principal - exporte useAppForm, withForm, withFieldGroup
├── checkbox-field.tsx        # Champ de type checkbox
├── input-field.tsx          # Champ input générique (texte, nombre, email, etc.)
├── select-field.tsx         # Champ de sélection
├── radio-group-field.tsx    # Groupe de boutons radio
├── textarea-field.tsx       # Zone de texte multiligne
├── submit-button.tsx        # Bouton de soumission réactif
├── form-error-display.tsx   # Affichage des erreurs de formulaire
├── field-info.tsx           # Composant d'information de champ
├── form-errors.tsx          # Liste des erreurs de formulaire
├── form-footer.tsx          # Footer de formulaire
├── form-layout.tsx          # Layout responsive pour formulaires
└── form-section.tsx         # Section de formulaire
```

## API principale

### `useAppForm`

Hook personnalisé pour créer un formulaire TanStack Form avec pré-configuration des composants.

```tsx
import { useAppForm } from "@/components/forms";

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
		<form.AppForm>
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

			<form.SubmitButton label="Se connecter" />
		</form.AppForm>
	);
}
```

### `withForm`

Higher-order component pour décomposer les grands formulaires en morceaux réutilisables.

```tsx
import { useAppForm, withForm } from "@/components/forms";

const AddressFields = withForm({
	defaultValues: {
		street: "",
		city: "",
		zipCode: "",
	},
	render: function Render({ form }) {
		return (
			<div className="space-y-4">
				<form.AppField name="street">
					{(field) => <field.InputField label="Rue" required />}
				</form.AppField>

				<form.AppField name="city">
					{(field) => <field.InputField label="Ville" required />}
				</form.AppField>

				<form.AppField name="zipCode">
					{(field) => <field.InputField label="Code postal" required />}
				</form.AppField>
			</div>
		);
	},
});

function UserForm() {
	const form = useAppForm({
		defaultValues: {
			name: "",
			street: "",
			city: "",
			zipCode: "",
		},
	});

	return (
		<form.AppForm>
			<form.AppField name="name">
				{(field) => <field.InputField label="Nom" required />}
			</form.AppField>

			<AddressFields form={form} />

			<form.SubmitButton label="Enregistrer" />
		</form.AppForm>
	);
}
```

### `withFieldGroup`

Higher-order component pour réutiliser des groupes de champs liés dans plusieurs formulaires.

```tsx
import { useAppForm, withFieldGroup } from "@/components/forms";
import { useStore } from "@tanstack/react-store";

type PasswordFields = {
	password: string;
	confirmPassword: string;
};

const defaultValues: PasswordFields = {
	password: "",
	confirmPassword: "",
};

const PasswordFieldGroup = withFieldGroup({
	defaultValues,
	render: function Render({ group }) {
		const password = useStore(group.store, (state) => state.values.password);

		return (
			<div className="space-y-4">
				<group.AppField name="password">
					{(field) => (
						<field.InputField label="Mot de passe" type="password" required />
					)}
				</group.AppField>

				<group.AppField
					name="confirmPassword"
					validators={{
						onChangeListenTo: ["password"],
						onChange: ({ value, fieldApi }) => {
							if (value !== group.getFieldValue("password")) {
								return "Les mots de passe ne correspondent pas";
							}
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Confirmer le mot de passe"
							type="password"
							required
						/>
					)}
				</group.AppField>
			</div>
		);
	},
});

// Utilisation avec champs au niveau racine
function CreateAccountForm() {
	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	return (
		<form.AppForm>
			<PasswordFieldGroup
				form={form}
				fields={{
					password: "password",
					confirmPassword: "confirmPassword",
				}}
			/>
			<form.SubmitButton label="Créer un compte" />
		</form.AppForm>
	);
}

// Utilisation avec champs imbriqués
function UserSettingsForm() {
	const form = useAppForm({
		defaultValues: {
			email: "",
			security: {
				password: "",
				confirmPassword: "",
			},
		},
	});

	return (
		<form.AppForm>
			<PasswordFieldGroup form={form} fields="security" />
			<form.SubmitButton label="Mettre à jour" />
		</form.AppForm>
	);
}
```

## Composants de champs disponibles

Tous les composants de champs utilisent `useFieldContext` et sont pré-configurés dans `fieldComponents`.

### `InputField`

Champ input générique avec support de plusieurs types.

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

### `SelectField`

Champ de sélection.

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
		/>
	)}
</form.AppField>
```

### `CheckboxField`

Case à cocher.

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

Zone de texte multiligne.

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

## Composants de formulaire disponibles

Ces composants utilisent `useFormContext` et sont pré-configurés dans `formComponents`.

### `SubmitButton`

Bouton de soumission réactif qui se désactive automatiquement pendant la soumission.

```tsx
<form.AppForm>
	<form.SubmitButton
		label="Enregistrer"
		loadingLabel="Enregistrement..."
		variant="default"
	/>
</form.AppForm>
```

**Props:**

- `label?: string` - Texte du bouton (défaut: "Envoyer")
- `loadingLabel?: string` - Texte pendant la soumission (défaut: "Envoi...")
- `variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"`

### `FormErrorDisplay`

Affiche les erreurs globales du formulaire (erreurs `onSubmit`).

```tsx
<form.AppForm>
	<form.FormErrorDisplay />
	{/* Champs du formulaire */}
</form.AppForm>
```

## Composants UI helpers

Ces composants sont disponibles pour la mise en page et l'organisation.

### `FormLayout`

Layout responsive pour organiser les champs en colonnes.

```tsx
import { FormLayout } from "@/components/forms";

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
import { FormSection } from "@/components/forms";

<FormSection
	title="Informations personnelles"
	description="Renseignez vos informations de contact"
>
	{/* Champs de la section */}
</FormSection>;
```

### `FieldInfo`

Texte d'aide pour un champ.

```tsx
import { FieldInfo } from "@/components/forms";

<FieldInfo>Votre email ne sera jamais partagé</FieldInfo>;
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

## Bonnes pratiques

1. **Utilisez `useAppForm`** au lieu de `useForm` pour bénéficier des composants pré-configurés
2. **Utilisez `form.AppField`** au lieu de `form.Field` pour accéder aux composants de champs
3. **Utilisez `form.AppForm`** au lieu de `form.Provider` pour accéder aux composants de formulaire
4. **Décomposez les grands formulaires** avec `withForm` pour améliorer la lisibilité
5. **Réutilisez les groupes de champs** avec `withFieldGroup` pour les champs liés
6. **Validez au bon moment**: `onChange` pour les feedbacks immédiats, `onBlur` pour valider après la saisie, `onSubmit` pour les validations globales

## Références

- [TanStack Form - Form Composition](https://tanstack.com/form/latest/docs/framework/react/guides/form-composition)
- [TanStack Form - Validation](https://tanstack.com/form/latest/docs/framework/react/guides/validation)
