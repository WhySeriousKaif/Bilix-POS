# Custom FAQ Accordion

## What this section does

The FAQ shows common questions. Only one answer is opened at a time. Clicking the same question closes it.

## State

```jsx
const [openFaqIndex, setOpenFaqIndex] = useState(-1)
```

`-1` means that no question is open.

## Rendering the FAQ

```jsx
{faqs.map((faq, index) => {
  const isOpen = openFaqIndex === index

  return (
    <div key={faq.question}>
      <button
        onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
      >
        {faq.question}
      </button>

      {isOpen && <p>{faq.answer}</p>}
    </div>
  )
})}
```

## How it works

1. `faqs.map()` creates one row for every FAQ item.
2. `index` identifies the clicked row.
3. `isOpen` checks whether this row is currently selected.
4. Clicking an already-open row stores `-1`, so it closes.
5. Clicking another row stores its index, so the previous answer closes and the new answer opens.

In the project, CSS grid classes animate the answer area from closed to open, and the plus icon rotates when `isOpen` is true.

## Interview explanation

“I built the FAQ accordion with React state. I store the index of the open question instead of creating separate state for every row. The list is rendered from data, so adding a new question only requires adding an object to the FAQ array.”

## MERN connection

This is the same React idea used in a MERN frontend: data is mapped into components, and `useState` controls which item is expanded. No external accordion component is required.
