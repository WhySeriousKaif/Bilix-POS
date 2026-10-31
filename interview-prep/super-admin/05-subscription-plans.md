# Subscription Plans

## Backend shape and UI shape

The backend uses names such as `maxBranches`, `maxUsers`, `maxProducts`, and `active`. The page converts them into shorter UI fields with `fromDto()` and converts them back with `toDto()` before sending a request.

```jsx
const toDto = (form) => ({
  name: form.name,
  price: parseFloat(form.price) || 0,
  maxBranches: parseInt(form.branches) || 0,
  maxUsers: parseInt(form.users) || 0,
  maxProducts: parseInt(form.products) || 0,
  features: form.features,
  active: form.isActive,
})
```

## CRUD flow

- Page load: `subscriptionPlanAPI.getAll()`
- Add: `subscriptionPlanAPI.create(toDto(newPlan))`
- Edit: `subscriptionPlanAPI.update(selectedPlan.id, toDto(editPlan))`
- Delete: `subscriptionPlanAPI.delete(id)`

After every successful mutation, `fetchPlans()` runs again. This keeps the cards and table synchronized with the database.

## Form state

The add and edit dialogs have separate state objects. Opening edit copies the selected plan into `editPlan`; saving converts the form back to the backend DTO.

## Interview explanation

“I kept the API model separate from the form model. Small mapper functions translate between them, which prevents UI naming decisions from leaking into the backend contract. Every create, update, or delete operation reloads the list so the screen always reflects server data.”
