# Why Bilix Cards

## Purpose

The Why Bilix section shows four reasons a business may choose the product. Each card has an icon, title and description.

## Data and rendering

The content is stored as data:

```jsx
const reasons = [
  {
    icon: Zap,
    title: 'No Setup Fees',
    description: 'Start billing today without hidden onboarding charges.',
  },
]
```

The page renders one card per item:

```jsx
{reasons.map((item) => (
  <WhyUsCard key={item.title} item={item} />
))}
```

The `key` helps React identify each item when rendering the list.

## Reusable card

```jsx
function WhyUsCard({ item }) {
  const Icon = item.icon

  return (
    <article className="rounded-2xl border p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>

      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </article>
  )
}
```

`item.icon` contains a React component such as `Zap` or `Shield`. Assigning it to an uppercase variable (`Icon`) lets JSX render it as `<Icon />`.

## Interview explanation

> I kept the Why Bilix section data-driven. The parent stores each benefit as an object, including the icon component. It maps over those objects and passes each one to `WhyUsCard`. The card receives data through props and only handles presentation. This avoids duplicating markup and makes adding a new reason straightforward.

## Why no external card library is needed

The card only needs an `article`, a small icon container, a heading and a paragraph. Native HTML and CSS classes are enough. A library would add behavior that this static content does not need.
