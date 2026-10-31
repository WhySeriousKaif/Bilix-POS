# Custom Testimonials Row

## What changed?

The testimonials section originally used an `InfiniteMovingCards` component. That component duplicated cards, created a CSS animation and paused the animation on hover.

It is now a simple `SimpleTestimonials` component using normal React rendering and native horizontal scrolling.

```jsx
function SimpleTestimonials({ testimonials }) {
  return (
    <div className="flex gap-6 overflow-x-auto">
      {testimonials.map((testimonial) => (
        <article key={testimonial.name} className="w-[420px] shrink-0 rounded-2xl p-8">
          <blockquote>“{testimonial.content}”</blockquote>
          <p>{testimonial.name}</p>
          <p>{testimonial.role}, {testimonial.company}</p>
        </article>
      ))}
    </div>
  )
}
```

## How it works

```text
testimonials array
        ↓
map() creates one article for each testimonial
        ↓
article displays quote and author information
        ↓
overflow-x-auto allows horizontal scrolling
```

The component receives the existing `testimonials` array as a prop. It does not fetch data or contain business logic.

## Interview explanation

> I created a reusable testimonial row that receives an array of testimonials. I use `map()` to render one semantic `article` for each quote. The cards use `shrink-0` so they keep their width, and `overflow-x-auto` lets the user scroll horizontally on smaller screens. This is enough for static testimonials; an animation library is not necessary.

## Continuous movement

The testimonial row can move continuously without a library by duplicating the array and animating the track:

```jsx
<div className="overflow-hidden">
  <div className="testimonial-track flex w-max gap-6">
    {[...testimonials, ...testimonials].map((testimonial, index) => (
      <TestimonialCard key={`${testimonial.name}-${index}`} testimonial={testimonial} />
    ))}
  </div>
</div>
```

The CSS animation moves the track by half its total width. Since the second half is an exact copy of the first half, the loop appears continuous:

```css
@keyframes testimonial-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(calc(-50% - 0.75rem)); }
}

.testimonial-track {
  animation: testimonial-scroll 55s linear infinite;
}
```

The animation is slow (`55s`) and pauses on hover with:

```jsx
className="testimonial-track hover:[animation-play-state:paused]"
```

Interview explanation:

> I duplicated the testimonial data so the second half can replace the first half without a visible jump. A CSS keyframe translates the complete track continuously. The browser handles the animation, so no carousel or motion library is necessary. I pause it on hover to make reading easier.

## Why this is simpler

- No duplicated DOM nodes.
- No animation setup or cleanup.
- No hover animation state.
- Native browser scrolling handles the horizontal row.
- The same component works with any testimonial data.
