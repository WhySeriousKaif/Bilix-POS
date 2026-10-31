# Super Admin Layout and Navigation

## Shared layout

`SuperAdminLayout` wraps every super-admin page. It provides one header, one sidebar, and a main content area:

```jsx
<SuperAdminLayout>
  <Dashboard />
</SuperAdminLayout>
```

The child page changes when React Router changes the URL, while the layout stays visible.

## Sidebar navigation

The menu is data-driven:

```jsx
const menuItems = [
  { label: 'Dashboard', path: '/super-admin' },
  { label: 'Stores', path: '/super-admin/stores' },
  { label: 'Users', path: '/super-admin/users' },
]
```

The component maps over this array and calls `navigate(path)` when a button is clicked. `location.pathname` is used to add the active style.

## Collapsing the sidebar

```jsx
const [collapsed, setCollapsed] = useState(false)
```

The same state controls the sidebar width and whether labels are shown. The value is saved in `localStorage`, so the preference remains after a refresh.

## Search

The header loads stores and users from the backend once. The search text is stored in state, then `filter()` checks names, emails, roles, and store fields. Results are grouped into pages, stores, and users.

## Notifications

Pending stores are loaded from the store API. The notification count is the number of pending stores. Clicking a notification navigates to the pending-request page.

## Native UI implementation

The mobile menu and notification panel use conditional rendering and normal `div`/`button` elements. This keeps the behavior simple and removes the dependency on prebuilt Sheet, Popover, and Button components.

## Interview explanation

“I created one reusable layout for all Super Admin routes. Navigation is data-driven, URL changes are handled by React Router, and the active menu item is derived from the current pathname. Shared data such as notifications and search results is fetched by the layout so every child page can focus only on its own content.”
