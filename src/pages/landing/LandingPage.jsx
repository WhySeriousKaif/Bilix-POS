import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import {
  ShoppingCart,
  BarChart3,
  Lock,
  CheckCircle2,
  Store,
  Users,
  TrendingUp,
  Shield,
  Zap,
  FileText,
  ArrowRight,
  Play,
  Star,
  Sparkles,
  Plus,
} from 'lucide-react'
import logoP from '@/assets/logo_p_transparent.png'
import { testimonials } from '@/data/testimonials'
import { subscriptionPlanAPI } from '@/services/api'

function SimpleBenefitCard({ card }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <article
        className="relative h-[480px] w-[310px] sm:w-[330px] md:w-[350px] shrink-0 overflow-hidden rounded-[2.2rem] border border-slate-200/20 bg-slate-950 text-left shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl"
      >
        <img src={card.src} alt={card.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/35" />
        <div className="relative z-10 flex h-full flex-col justify-between p-7 md:p-8">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300">{card.category}</p>
            <h3 className="font-mono text-[22px] font-bold leading-[1.28] text-white">{card.title}</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start cursor-pointer border-b border-blue-400/60 pb-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-blue-300 hover:border-white hover:text-white"
          >
            View details →
          </button>
        </div>
      </article>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="relative my-8 w-full max-w-3xl rounded-[2rem] bg-white p-6 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white md:p-10" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} className="absolute right-5 top-5 cursor-pointer rounded-full bg-slate-100 px-3 py-2 text-xl dark:bg-slate-800" aria-label="Close details">×</button>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">{card.category}</p>
            <h3 className="mb-6 text-2xl font-black md:text-3xl">{card.title}</h3>
            <img src={card.src} alt={card.title} className="mb-6 h-64 w-full rounded-2xl object-cover md:h-80" />
            {card.content}
          </div>
        </div>
      )}
    </>
  )
}

function SimpleBenefitsCarousel({ children }) {
  const listRef = React.useRef(null)
  const move = (amount) => listRef.current?.scrollBy({ left: amount, behavior: 'smooth' })

  return (
    <div className="relative w-full">
      <div className="mb-8 flex justify-end gap-3 px-4 md:px-12">
        <button type="button" onClick={() => move(-380)} className="h-12 w-12 cursor-pointer rounded-full border border-slate-300 bg-white text-2xl text-slate-700 shadow-md" aria-label="Previous benefit">←</button>
        <button type="button" onClick={() => move(380)} className="h-12 w-12 cursor-pointer rounded-full border border-slate-300 bg-white text-2xl text-slate-700 shadow-md" aria-label="Next benefit">→</button>
      </div>
      <div ref={listRef} className="flex gap-6 overflow-x-auto px-4 py-4 [scrollbar-width:none] md:px-12 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  )
}

function PlatformPreviewItem({ item }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.7fr]">
      <div className="text-center lg:text-left">
        <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          {item.role}
        </span>
        <h3 className="mb-3 text-2xl font-black leading-tight text-slate-900 dark:text-white sm:text-3xl">{item.title}</h3>
        <p className="mx-auto max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400 lg:mx-0">{item.description}</p>
      </div>
      <div className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-[#0b1324] p-2 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.6)] dark:border-white/10">
        <div className="mb-2 flex items-center gap-1.5 px-2">
          <span className="size-2 rounded-full bg-rose-400/90" /><span className="size-2 rounded-full bg-amber-300/90" /><span className="size-2 rounded-full bg-emerald-400/90" />
          <span className="ml-2 text-[10px] font-semibold tracking-wide text-slate-500">bilix workspace</span>
        </div>
        <div className="overflow-hidden rounded-xl bg-slate-900">
          <img src={item.image} alt={item.title} className="block max-h-[600px] w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.01]" />
        </div>
      </div>
    </div>
  )
}

function SimplePricingCard({ plan, onStart }) {
  return (
    <article className={`relative flex h-full flex-col rounded-2xl border p-8 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl ${plan.popular
      ? 'border-blue-500 bg-white shadow-blue-500/20 dark:bg-slate-900'
      : 'border-black/10 bg-white/70 dark:border-white/10 dark:bg-slate-900/70'
      }`}>
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-600/30">
          Most Popular
        </span>
      )}

      <h3 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-black text-slate-900 dark:text-white">{plan.price}</span>
        <span className="text-slate-500 dark:text-slate-400">{plan.period}</span>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-500" aria-hidden="true">✓</span>
            <span className="text-slate-700 dark:text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onStart}
        className={`w-full cursor-pointer rounded-lg px-4 py-3 font-semibold text-white transition-colors ${plan.popular
          ? 'bg-blue-600 hover:bg-blue-500'
          : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
          }`}
      >
        Get Started
      </button>
    </article>
  )
}

function WhyUsCard({ item }) {
  const Icon = item.icon

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="mb-1.5 text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.description}</p>
    </article>
  )
}

function SimpleTestimonials({ testimonials }) {
  return (
    <div className="overflow-hidden px-4 py-4 md:px-12">
      <div className="testimonial-track flex w-max gap-6 hover:[animation-play-state:paused]">
        {[...testimonials, ...testimonials].map((testimonial, index) => (
          <article key={`${testimonial.name}-${index}`} className="w-[420px] max-w-[calc(100vw-2rem)] shrink-0 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-9 py-8 shadow-sm dark:border-slate-700/60 dark:from-slate-800/80 dark:to-slate-900/80">
            <blockquote className="text-base leading-relaxed text-slate-700 dark:text-slate-200 md:text-lg">
              “{testimonial.content}”
            </blockquote>
            <div className="mt-8">
              <p className="font-semibold text-slate-900 dark:text-white">{testimonial.name}</p>
              <p className="text-sm text-blue-600 dark:text-blue-300/80">{testimonial.role}, {testimonial.company}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

const LandingPage = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState(-1)
  const [pricingPlans, setPricingPlans] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    subscriptionPlanAPI.getAll()
      .then((plans) => {
        const active = (plans || []).filter((p) => p.active).sort((a, b) => a.price - b.price)
        setPricingPlans(
          active.map((plan, index) => ({
            name: plan.name,
            price: `₹${plan.price.toLocaleString()}`,
            period: '/month',
            popular: index === 1 || (active.length === 1 && index === 0),
            features: (plan.features || '').split(',').map((f) => f.trim()).filter(Boolean),
          }))
        )
      })
      .catch((error) => console.error('Error fetching pricing plans:', error))
  }, [])

  const features = [
    {
      icon: ShoppingCart,
      title: 'Fast Checkout',
      description: 'Streamlined checkout process for faster transactions',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Get instant insights into your business performance',
    },
    {
      icon: Lock,
      title: 'Secure Access',
      description: 'Enterprise-grade security for your data',
    },
    {
      icon: CheckCircle2,
      title: 'GST Ready',
      description: 'Compliant with tax regulations and reporting',
    },
  ]

  const faqs = [
    {
      category: 'HOW IT WORKS',
      question: 'Okay, how does Bilix actually work?',
      answer: "Install Bilix on your billing counter, add your products once, and you're scanning and charging customers within the hour. Inventory, receipts, and reports update in real time across every connected device.",
    },
    {
      category: 'SPEED',
      question: 'How fast is checkout, really?',
      answer: 'Barcode scans register in under a second and payments settle instantly over UPI, card, or cash. Most stores cut their average checkout time by more than half in the first week.',
    },
    {
      category: 'SCALE',
      question: 'Can it handle more than one store?',
      answer: 'Yes — Bilix is built for chains. Manage pricing, stock transfers, and staff across every branch from one dashboard, whether you run 2 stores or 200.',
    },
    {
      category: 'OFFLINE',
      question: 'What happens if the internet drops?',
      answer: 'Nothing stops. Bilix keeps billing locally on the terminal and automatically syncs every transaction to the cloud the moment connection is restored — no lost sales, no manual reconciliation.',
    },
    {
      category: 'ONBOARDING',
      question: 'What if my team has never used a POS before?',
      answer: "The interface is built to be learned in minutes, not days, and every plan includes onboarding support. Most cashiers are comfortable running the counter solo on day one.",
    },
  ]

  // Public video files loop including 21117-315137086_large.mp4
  const videos = ['/zs-supermarket-bg.mp4', '/videoKaif.mp4', '/21117-315137086_large.mp4']
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)

  const handleVideoEnded = () => {
    setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFE] dark:bg-[#0F1729] text-slate-900 dark:text-slate-100 selection:bg-blue-800 selection:text-white transition-colors">
      <Navbar />

      {/* Hero Section with Full-Screen Video Background - Fill Entire Window (100vh) */}
      <section className="relative h-screen w-full flex flex-col justify-center overflow-hidden bg-[#F8FAFE] dark:bg-black text-slate-900 dark:text-white transition-colors">
        {/* Background Video Layer - 100% Untouched Original Video Colors */}
        <div className="absolute inset-0 z-0">
          <video
            key={currentVideoIndex}
            src={videos[currentVideoIndex]}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            className="w-full h-full object-cover"
          />
          {/* Text Readability Shadow - just a light tint in light mode (video stays visible), dark scrim in dark mode */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/10 to-transparent dark:from-black/75 dark:via-black/25 dark:to-transparent pointer-events-none"></div>
        </div>

        {/* Hero Content - Left Aligned */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 w-full text-left space-y-6 pt-16">
          {/* Main Headline */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.05] max-w-3xl drop-shadow-lg">
            Retail & Supermarket <br className="hidden sm:block" />
            billing software
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-900 dark:text-slate-100 max-w-xl leading-relaxed font-medium [text-shadow:0_1px_16px_rgb(255_255_255_/_85%),0_1px_4px_rgb(255_255_255_/_90%)] dark:[text-shadow:0_1px_12px_rgb(0_0_0_/_70%)]">
            Run your retail store, supermarket, or mall effortlessly by streamlining every aspect of your business — from instant checkouts to multi-store inventory.
          </p>

          {/* Action CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={() => navigate('/auth/register')}
              className="cursor-pointer bg-blue-800 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-2xl shadow-blue-800/40 hover:scale-105 transition-all"
            >
              GETTING STARTED
            </button>
            <button
              onClick={() => navigate('/auth/login')}
              className="cursor-pointer bg-white/70 hover:bg-white text-slate-900 border border-black/10 dark:bg-black/70 dark:hover:bg-black dark:text-white dark:border-white/30 font-extrabold text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full backdrop-blur-md hover:scale-105 transition-all"
            >
              REQUEST A DEMO
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Section — Pure Light Off-White Theme Carousel (#FAFAFD) */}
      <section id="features" className="py-24 bg-[#FAFAFD] dark:bg-slate-900 text-slate-900 dark:text-white relative overflow-hidden transition-colors border-t border-slate-200/60">
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-[0.08]"
          style={{ backgroundImage: "url('/bilix_b_logo.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="max-w-4xl mx-auto px-4 text-center mb-6 relative z-10">
          <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-blue-800 bg-blue-100/90 border border-blue-200 px-4 py-1.5 rounded-full mb-4 shadow-sm">
            EXPLORE POS BENEFITS
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.2] mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Benefits of Bilix as your
            <br /><em>supermarket billing POS</em>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            Everything you need to streamline checkouts, eliminate queues, and manage your supermarket or retail stores efficiently.
          </p>
        </div>

        <SimpleBenefitsCarousel>
          {[
            {
              category: "SMART INVENTORY",
              title: "Never run out. Stock alerts fire before shelves go empty.",
              src: "/zs-supermarket-benefits-image-2-2x.webp",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    Bilix POS continuously monitors inventory across all product categories in real time. Receive automated reorder notifications before high-demand items run out, track expiry dates for fresh produce, and run instant barcode stock audits.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Automated Reorder Triggers</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Set min/max threshold triggers to automatically generate purchase orders for suppliers.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Batch & Expiry Management</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Track batch numbers and shelf life to eliminate food & product wastage.</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              category: "FULL PLATFORM VIEW",
              title: "One dashboard. Every sale, every product, every insight.",
              src: "/hero_new.png",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    The Bilix command center gives you a live view of your entire retail operation — from the POS terminal screen to your inventory levels, sales graphs, and connected payment terminals. Everything in one place.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-sm">
                      <h5 className="font-bold text-blue-900 dark:text-blue-200 text-base mb-1">Unified POS Dashboard</h5>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Monitor live sales, receipts, and inventory from a single Bilix dashboard screen.</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-sm">
                      <h5 className="font-bold text-blue-900 dark:text-blue-200 text-base mb-1">Connected Payment Terminal</h5>
                      <p className="text-xs text-blue-700 dark:text-blue-300">NFC, UPI, card, and cash all flow into one receipt — no manual reconciliation needed.</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              category: "SPEED AT CHECKOUT",
              title: "Scan, pay, done — queues vanish in seconds.",
              src: "/zs-supermarket-benefits-image-3-2x.webp",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    Process billing transactions in sub-second speed with high-volume barcode scanning and multi-mode payment collection. Seamlessly accept UPI, Razorpay QR codes, Credit/Debit cards, and Cash.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Dynamic UPI & QR Codes</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Generates instant payment QR code right on cashier screen for zero-friction payment.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Thermal & WhatsApp Receipts</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Print instant thermal receipts or send digital paperless receipts via SMS/WhatsApp.</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              category: "CHAIN MANAGEMENT",
              title: "Run ten stores from one screen. Centrally. Cleanly.",
              src: "/zs-supermarket-benefits-image-4-2x.webp",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    Managing 2 or 50 branches? Bilix gives super admins centralized control over multi-store product catalogs, pricing rules, tax settings, and stock transfers from a single unified cloud portal.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Inter-Store Stock Transfers</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Move excess inventory between branches seamlessly with real-time transfer tracking.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Centralized Price Updates</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Update item prices or launch discounts across all stores in one single click.</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              category: "CASH ACCOUNTABILITY",
              title: "Every rupee tracked. Every shift closed without a gap.",
              src: "/zs-supermarket-benefits-image-5-2x.webp",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    Ensure 100% cashier accountability with shift-based register drawer reconciliation. Track opening cash, cash drops, card totals, and manager approvals for voids and refunds.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Shift Closing Reconciliation</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Automated end-of-day till reports comparing physical cash count with register ledger.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Role-Based Cashier Security</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Restrict price overrides, discounts, and register opening to authorized managers.</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              category: "HARDWARE SYNC",
              title: "Weigh it. Scan it. Bill it — in one fluid motion.",
              src: "/pos_weighing_scale.png",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    Instantly weigh fresh fruits, vegetables, and bulk grains at the billing counter with direct weighing scale integration into Bilix POS, automatically calculating exact weights and prices.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Auto Weight Fetching</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Eliminates manual weight entry errors with sub-gram scale hardware integration.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Embedded Barcode Printing</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Print price-embedded barcodes for pre-packed items at your weighing stations.</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              category: "ALWAYS ONLINE",
              title: "No internet? No problem. Billing never stops.",
              src: "/pos_offline_sync.png",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    Never lose a sale due to poor internet connection. Bilix POS stores all local billing transactions securely on the terminal and auto-synchronizes with the cloud as soon as connection is restored.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">100% Offline Billing</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Keep registers running and bills printing even without Wi-Fi connection.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Background Cloud Sync</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Automatic background sync resolves duplicate invoices and updates stock levels globally.</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              category: "LIVE ANALYTICS",
              title: "See profit margins move — in real time, on any device.",
              src: "/pos_analytics_card.png",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    Make data-backed decisions with Bilix live analytics. Monitor peak hour store traffic, top grossing categories, gross profit margins, and sales rep performance right from your mobile device.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Live Executive Dashboard</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Real-time revenue stream tracking with visual charts updated every minute.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Automated GST & P&L Reports</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Receive automated daily P&L and GST tax summaries delivered directly to your inbox.</p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              category: "LOYALTY & CRM",
              title: "Customers come back. Because Bilix remembers them.",
              src: "/customer_loyalty_card.png",
              content: (
                <div className="space-y-4">
                  <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed">
                    Turn one-time shoppers into lifelong loyal customers. Bilix automatically tracks purchase history by customer phone number, awards loyalty points, and enables instant point redemption at billing.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Instant Reward Redemption</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Shoppers redeem saved reward points as instant cash discounts at checkout.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h5 className="font-bold text-slate-900 dark:text-white text-base mb-1">Personalized SMS Offers</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Send custom discount vouchers to inactive customers to drive repeat store footfall.</p>
                    </div>
                  </div>
                </div>
              ),
            },
          ].map((card, idx) => (
            <SimpleBenefitCard key={card.title} card={card} />
          ))}
          </SimpleBenefitsCarousel>
        </section>

      {/* Platform Preview Section — real screenshots of the actual product, not mockups */}
      <section id="platform-preview" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F0F4FB] dark:bg-[#0C1424] transition-colors">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span
              className="inline-block text-xs font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-4 py-1.5 rounded-full mb-4"
              style={{ fontFamily: "'JetBrains Mono', 'Monaco', monospace" }}
            >
              SEE IT IN ACTION
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
              One platform, built for every role
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              From the billing counter to the boardroom — every screen in Bilix is designed for the person actually using it.
            </p>
          </div>

          {(() => {
            const rolePreviews = [
              {
                image: '/SuperAdmin.png',
                role: 'SUPER ADMIN',
                title: 'Company-wide visibility and control',
                description: 'Monitor stores, sales, refunds, subscriptions, and platform health from one secure command center.',
              },
              {
                image: '/cashierPage.png',
                role: 'CASHIER',
                title: 'Billing counter, built for speed',
                description: "Scan, discount, and checkout in seconds — cash, card, or UPI, all from one screen. Stock levels update the moment an order is placed.",
              },
              {
                image: '/managerPage.png',
                role: 'BRANCH MANAGER',
                title: 'The live pulse of one branch',
                description: "Today's sales, active staff, refunds, and payment mix — updated in real time, with a 7-day revenue trend at a glance.",
              },
              {
                image: '/StoreAdminPage.png',
                role: 'STORE ADMIN',
                title: 'The full business, at a glance',
                description: 'Every branch, every product, every employee — rolled up into one dashboard, so nothing needs a spreadsheet to explain it.',
              },
            ]
            const [activeRole, setActiveRole] = React.useState(0)
            const item = rolePreviews[activeRole]
            return (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="tablist" aria-label="Bilix platform roles">
                  {rolePreviews.map((role, index) => (
                    <button
                      key={role.role}
                      type="button"
                      role="tab"
                      aria-selected={activeRole === index}
                      onClick={() => setActiveRole(index)}
                      className={`group rounded-2xl border p-4 text-left transition-all duration-300 ${activeRole === index ? 'border-blue-500 bg-blue-600 text-white shadow-xl shadow-blue-500/25' : 'border-slate-200 bg-white/80 text-slate-700 hover:-translate-y-1 hover:border-blue-300 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200'}`}
                    >
                      <span className={`mb-3 block size-3 rounded-full ring-4 ${activeRole === index ? 'bg-white ring-white/20' : 'bg-blue-500 ring-blue-500/10'}`} />
                      <span className="block text-xs font-black tracking-widest">{role.role}</span>
                      <span className={`mt-1 block text-xs ${activeRole === index ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>Explore workspace</span>
                    </button>
                  ))}
                </div>
                <PlatformPreviewItem item={item} />
              </div>
            )
          })()}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F0F4FB] dark:bg-[#0C1424] transition-colors">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span
              className="inline-block text-xs font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-4 py-1.5 rounded-full mb-4"
              style={{ fontFamily: "'JetBrains Mono', 'Monaco', monospace" }}
            >
              PRICING
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Choose the plan that best fits your business needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <SimplePricingCard key={plan.name} plan={plan} onStart={() => navigate('/auth/register')} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section id="why-us" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#E9EFFA] dark:bg-[#0A101E] transition-colors">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span
              className="inline-block text-xs font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-4 py-1.5 rounded-full mb-4"
              style={{ fontFamily: "'JetBrains Mono', 'Monaco', monospace" }}
            >
              WHY BILIX
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
              Why teams switch to Bilix
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              No pricing tricks, no fine print — just the things most other POS platforms make you live without.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: 'No Setup Fees',
                description: 'Start billing today. No onboarding cost, no hidden charges to get going.',
              },
              {
                icon: Shield,
                title: 'Works Without Internet',
                description: "Most platforms stop cold on a dropped connection. Bilix keeps billing and syncs later.",
              },
              {
                icon: Store,
                title: 'Built for Chains from Day One',
                description: 'Run 2 branches or 200 from one dashboard — no extra charge per location.',
              },
              {
                icon: Users,
                title: 'Real Human Support',
                description: "Talk to a person, not a ticket queue, whenever something breaks.",
              },
            ].map((item) => <WhyUsCard key={item.title} item={item} />)}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#E2E9F7] dark:bg-[#080D19] overflow-hidden transition-colors">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
              What Our Customers Say
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Trusted by businesses worldwide
            </p>
          </div>
        </div>

        <SimpleTestimonials testimonials={testimonials} />
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#DCE4F5] dark:bg-[#060A14] transition-colors">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <span
              className="inline-block text-xs font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-4 py-1.5 rounded-full mb-4"
              style={{ fontFamily: "'JetBrains Mono', 'Monaco', monospace" }}
            >
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">
              Questions, answered.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Everything you need to know before you switch to Bilix.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div
                  key={faq.question}
                  className={`rounded-2xl border transition-colors ${isOpen ? 'border-blue-600/50 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 p-6 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="text-sm font-bold text-blue-600 dark:text-blue-400"
                        style={{ fontFamily: "'JetBrains Mono', 'Monaco', monospace" }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{faq.question}</span>
                    </div>
                    <Plus
                      className={`h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''
                        }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 pl-[3.25rem] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-slate-950 overflow-hidden">
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg text-blue-100 mb-10 max-w-xl mx-auto">
            Join thousands of retail stores and supermarkets using Bilix to streamline operations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth/register"
              className="bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-base px-6 py-3.5 rounded-full shadow-xl hover:scale-105 transition-all"
            >
              Start Free Trial
            </Link>
            <a
              href="#contact"
              className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-blue-700 font-extrabold text-base px-6 py-3.5 rounded-full"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="relative overflow-hidden pt-20 pb-4 px-4 sm:px-6 lg:px-8 bg-[#D6E0F3] dark:bg-[#04070F] border-t border-slate-200 dark:border-white/10 transition-colors"
      >
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="border-t border-slate-200 dark:border-white/10 pt-10" />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-12 pb-24">
            {/* Logo + Copyright */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/bilix_logo.png" alt="Bilix" className="h-9 w-9 object-contain rounded-lg bg-black p-0.5 border border-black/10 dark:border-white/10" />
                <span className="text-xl font-black text-slate-900 dark:text-white">Bilix</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                © 2026 Bilix POS System. All rights reserved.
              </p>
            </div>

            {/* Link Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Pages</h4>
                <ul className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
                  <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing</a></li>
                  <li><a href="#testimonials" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Testimonials</a></li>
                  <li><a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Company</h4>
                <ul className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
                  <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Blog</a></li>
                  <li><a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Legal</h4>
                <ul className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
                  <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Account</h4>
                <ul className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
                  <li>
                    <button onClick={() => navigate('/auth/register')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                      Sign Up
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/auth/login')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                      Login
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Giant bleeding wordmark accent */}
        <div aria-hidden="true" className="w-full overflow-hidden pointer-events-none select-none">
          <span className="block pl-4 sm:pl-8 font-black text-[22vw] sm:text-[16vw] leading-[0.75] tracking-tight text-slate-900/[0.04] dark:text-white/[0.05] whitespace-nowrap">
            Bilix
          </span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
