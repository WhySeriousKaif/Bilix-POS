# Custom Benefit Card and Carousel

## What was wrong?

The old benefits section used a pre-built `apple-cards-carousel` component. When it was replaced with our own component, the old `items=` prop was accidentally left behind. Because the new component accepts normal `children`, the browser displayed `items=` as visible text.

The fix was to use normal children:

```jsx
<SimpleBenefitsCarousel>
  {[...].map((card) => (
    <SimpleBenefitCard key={card.title} card={card} />
  ))}
</SimpleBenefitsCarousel>
```

`items=` is a prop. It is not needed when the component receives its cards as children.

## Simple card component

```jsx
function SimpleBenefitCard({ card }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <article className="relative h-[480px] w-[330px] overflow-hidden rounded-[2.2rem]">
        <img src={card.src} alt={card.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/35" />

        <div className="relative z-10 flex h-full flex-col justify-between p-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-300">{card.category}</p>
            <h3 className="font-mono text-2xl font-bold text-white">{card.title}</h3>
          </div>
          <button type="button" onClick={() => setOpen(true)}>View details →</button>
        </div>
      </article>

      {open && (
        <div onClick={() => setOpen(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)}>×</button>
            <h3>{card.title}</h3>
            <img src={card.src} alt={card.title} />
            {card.content}
          </div>
        </div>
      )}
    </>
  )
}
```

## Interview explanation

> I created a reusable `SimpleBenefitCard` component. It receives one `card` object as a prop, displays the image, category and title, and keeps its popup state locally with `useState`. The parent maps over an array and renders one card for each item. This keeps the UI reusable and easy to maintain.

## Simple carousel component

```jsx
function SimpleBenefitsCarousel({ children }) {
  const listRef = useRef(null)

  const move = (amount) => {
    listRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <div>
      <button onClick={() => move(-380)}>←</button>
      <button onClick={() => move(380)}>→</button>
      <div ref={listRef} className="flex gap-6 overflow-x-auto">
        {children}
      </div>
    </div>
  )
}
```

`useRef` gives access to the scrolling `<div>`. The arrow buttons call the browser's native `scrollBy` method. No carousel library or animation library is required.

## Component flow

```text
LandingPage owns the card data
        ↓
map() creates one SimpleBenefitCard per item
        ↓
SimpleBenefitsCarousel lays the cards horizontally
        ↓
useRef + scrollBy moves the row
        ↓
useState opens and closes the details popup
```

## Why this is easier to explain

- React props carry card data.
- `map()` avoids repeating the same JSX.
- `useState` controls only the popup state.
- `useRef` controls the scroll container.
- CSS handles the image, overlay, spacing and responsive layout.
- There is no external carousel component or hidden animation logic.
