# Custom Navbar and Landing Hero

## Navbar change

The Navbar originally imported a shared `Button` component:

```jsx
import { Button } from '@/components/ui/button'
```

The navigation now uses normal HTML buttons instead:

```jsx
<button
  onClick={() => navigate('/auth/register')}
  className="rounded-full bg-blue-800 px-6 py-2.5 font-bold text-white"
>
  GET FREE DEMO
</button>
```

This is easier to understand because the button has only three parts:

1. `onClick` runs an action when the user clicks.
2. `className` controls the visual design.
3. The text between the tags is the label.

The Navbar still uses React Router's `navigate()` for buttons and `Link` for normal links.

## Navbar responsibilities

The Navbar has three main responsibilities:

```text
Brand/logo       → navigate to the home page
Navigation links → jump to page sections or routes
Actions          → toggle theme, sign in, register, open mobile menu
```

### Scroll state

```jsx
const [scrolled, setScrolled] = useState(false)

useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 30)
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

When the page moves more than 30 pixels, the Navbar changes its classes. This makes it smaller and more opaque while scrolling.

### Mobile menu state

```jsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
```

The menu is shown only when this value is true:

```jsx
{mobileMenuOpen && (
  <div className="md:hidden">
    {/* mobile links */}
  </div>
)}
```

The `md:hidden` class means the mobile menu is hidden on medium and larger screens.

## Hero section

The landing hero is a full-screen section with a video background and content above it:

```jsx
<section className="relative h-screen overflow-hidden">
  <div className="absolute inset-0">
    <video
      src={videos[currentVideoIndex]}
      autoPlay
      muted
      playsInline
      onEnded={handleVideoEnded}
      className="h-full w-full object-cover"
    />

    <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent" />
  </div>

  <div className="relative z-10">
    <h1>Retail & Supermarket billing software</h1>
    <p>Run your retail store or supermarket effortlessly.</p>
  </div>
</section>
```

## Why each layer exists

```text
relative section       → creates a positioning context
absolute video layer   → fills the entire section as the background
object-cover           → fills the area without distorting the video
gradient overlay       → improves text readability
relative z-10 content  → keeps the text above the video
h-screen              → makes the hero one viewport high
```

The video is decorative, so it is muted and plays inline. `onEnded` changes the index and starts the next video:

```jsx
const handleVideoEnded = () => {
  setCurrentVideoIndex((index) => (index + 1) % videos.length)
}
```

## Hero interview explanation

> I built the hero as a full-screen relative section. The video is absolutely positioned behind the content, and `object-cover` makes it fill the viewport. A gradient overlay keeps the heading readable. The text and CTA buttons are placed in a higher z-index layer. React state changes the video when the current video ends, so the background can loop through multiple videos.

## Landing page flow

```text
Navbar
  ↓
Hero video + headline + CTA buttons
  ↓
Benefits custom card carousel
  ↓
Platform preview
  ↓
Pricing
  ↓
Why Bilix
  ↓
Testimonials
  ↓
FAQ
  ↓
Footer
```

The page is a composition of sections. Each section has a focused purpose, while the landing page coordinates the order and shared data.

## Why native elements are useful here

Using native `button`, `nav`, `header`, `section`, `video`, `h1` and `p` elements makes the implementation easier to explain and improves accessibility. CSS classes provide the appearance; React state and event handlers provide the behavior. No UI library is needed for the Navbar or hero.
