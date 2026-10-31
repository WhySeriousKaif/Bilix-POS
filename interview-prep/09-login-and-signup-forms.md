# Login and Signup Forms

## Simple structure

Both pages use the same basic flow:

1. Store form values with `useState`.
2. Update one field when the user types.
3. Stop the browser's default submit behavior.
4. Dispatch the Redux authentication action.
5. Redirect after authentication succeeds.

```jsx
const [formData, setFormData] = useState({ email: '', password: '' })

const handleChange = (event) => {
  setFormData({
    ...formData,
    [event.target.name]: event.target.value,
  })
}

const handleSubmit = async (event) => {
  event.preventDefault()
  await dispatch(loginUser(formData))
}
```

## Login versus signup

Login sends `email` and `password`. Signup sends `fullName`, `email`, `phone`, `password`, and the default public role `ROLE_STORE_ADMIN`.

```jsx
<input name="email" value={formData.email} onChange={handleChange} />
<input name="password" type="password" value={formData.password} onChange={handleChange} />
```

The input `name` must match the state property name. This lets one change handler update every field.

## Why native elements are useful here

The forms now use normal `div`, `input`, `button`, `h1`, and `p` elements. Tailwind classes provide the styling. This makes the form easy to explain and avoids depending on prebuilt Button, Input, or Card components.

The eye button only changes the input type between `password` and `text`; it does not expose or store the password separately.

## Interview explanation

“I built controlled React forms. React owns the input values, the submit handler dispatches the Redux login or registration action, and the authentication slice stores the result. After a successful login, the user's role decides which dashboard route is opened.”
