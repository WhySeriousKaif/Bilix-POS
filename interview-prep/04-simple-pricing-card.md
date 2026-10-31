# Simple Pricing Card

## What changed?

The pricing section previously used `CometCard` and `GlowingEffect`. Those components added mouse-based 3D movement and animated borders. We replaced them with one plain React component called `SimplePricingCard`.

```jsx
function SimplePricingCard({ plan, onStart }) {
  return (
    <article className="rounded-2xl border p-8 shadow-lg">
      {plan.popular && <span>Most Popular</span>}

      <h3>{plan.name}</h3>
      <strong>{plan.price}</strong>
      <span>{plan.period}</span>

      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>✓ {feature}</li>
        ))}
      </ul>

      <button type="button" onClick={onStart}>
        Get Started
      </button>
    </article>
  )
}
```

## How the data arrives

The landing page requests plans from the backend and converts each plan into a small object:

```jsx
{
  name: plan.name,
  price: `₹${plan.price.toLocaleString()}`,
  period: '/month',
  popular: index === 1,
  features: plan.features.split(',')
}
```

The parent maps over the plans:

```jsx
{pricingPlans.map((plan) => (
  <SimplePricingCard
    key={plan.name}
    plan={plan}
    onStart={() => navigate('/auth/register')}
  />
))}
```

`SimplePricingCard` does not fetch data or know about routing. It only displays the plan it receives and calls `onStart` when the button is clicked.

## What the component does

```text
plan.name       → plan heading
plan.price      → monthly price
plan.period     → /month label
plan.features   → feature list using map()
plan.popular    → Most Popular badge and highlighted border
onStart         → registration navigation callback
```

## Interview explanation

> I created a reusable pricing-card component that receives a plan object and a callback as props. The component renders the plan name, price, features and CTA. The parent owns the pricing data and routing, while the card owns only presentation. The popular plan is highlighted with a conditional render. I used native HTML and CSS instead of a pre-built animated card component, which keeps the behavior easy to understand and maintain.

## Why this is simpler

- No 3D mouse tracking.
- No animated border helper.
- No separate UI library card wrapper.
- One component works for every plan.
- The visual difference for the popular plan is just a conditional class.
- The button uses a normal click handler.

The pricing data still comes from the backend, so the cards remain dynamic even though their presentation is simple.
