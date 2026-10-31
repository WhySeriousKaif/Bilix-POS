# Platform Preview Section

## Purpose

This section shows how Bilix looks for different users:

- Cashier
- Branch manager
- Store admin

Each item has an image, role label, title and description.

## Data-driven rendering

Instead of writing the same HTML three times, the page stores the content in an array:

```jsx
const previews = [
  {
    image: '/cashierPage.png',
    role: 'CASHIER',
    title: 'Billing counter, built for speed',
    description: 'Scan, discount, and checkout in seconds.',
  },
  {
    image: '/managerPage.png',
    role: 'BRANCH MANAGER',
    title: 'The live pulse of one branch',
    description: "Today's sales, staff, refunds and payments.",
  },
]
```

Then React creates one component for each item:

```jsx
previews.map((item, index) => (
  <PlatformPreviewItem
    key={item.role}
    item={item}
    reverse={index % 2 === 1}
  />
))
```

`map()` prevents repeated JSX. `key` gives React a stable identity for each item.

## Reusable item component

```jsx
function PlatformPreviewItem({ item, reverse }) {
  return (
    <div className={reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'}>
      <div>
        <span>{item.role}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>

      <div>
        <img src={item.image} alt={item.title} />
      </div>
    </div>
  )
}
```

The component does not contain cashier-specific or manager-specific logic. It only displays whatever data it receives through `item`.

## Alternating layout

```jsx
reverse={index % 2 === 1}
```

This evaluates as:

```text
index 0 → false → text left, image right
index 1 → true  → image left, text right
index 2 → false → text left, image right
```

The Tailwind classes `lg:flex-row` and `lg:flex-row-reverse` change the layout only on large screens. On small screens the content remains stacked vertically.

## Interview explanation

> I made the platform preview data-driven. Each role is represented by a plain object, and the parent maps over the array to render a reusable `PlatformPreviewItem`. The component receives the content through props and alternates the image position using the array index. This avoids duplicate markup and makes adding another role a data-only change.

## Request flow

This section is static marketing content, so it does not call the backend:

```text
LandingPage owns preview data
        ↓
map() creates one item component per role
        ↓
props provide image and text
        ↓
CSS controls responsive layout
```

There is no external UI component in this section. It uses React, native `img` elements and CSS classes.
