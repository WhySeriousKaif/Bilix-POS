# CTA and Footer

## Call-to-action section

The CTA asks the visitor to take the next step:

```jsx
<Link to="/auth/register" className="cta-primary">
  Start Free Trial
</Link>

<a href="#contact" className="cta-secondary">
  Contact Sales
</a>
```

The first link uses React Router because it opens an application page. The second is a normal anchor because it scrolls to the contact/footer section on the same page.

## Footer

The footer is built with regular HTML elements:

```jsx
<footer id="contact">
  <a href="#pricing">Pricing</a>
  <a href="#faq">FAQ</a>
  <button onClick={() => navigate('/auth/login')}>Login</button>
</footer>
```

Hash links (`#pricing`, `#faq`, and `#contact`) move to sections on the landing page. Login and signup use `navigate()` because they are application routes.

## Interview explanation

“I created the CTA and footer using semantic HTML, React Router links for internal application pages, and anchor links for sections on the same landing page. The layout is controlled with normal flexbox and grid utility classes; no prebuilt button or footer component is required.”
