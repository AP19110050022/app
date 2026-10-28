import { useAuth } from "@clerk/react";
import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Video, Search, Send, ShieldCheck, Star, Check, ArrowRight, Sparkles, IndianRupee, MessageCircle, Clapperboard, Crown } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CreatorCard } from "@/components/CreatorCard";
import { PLANS } from "@/constants/options";
import { publicApi } from "@/lib/api";

const HERO = [
  "https://images.unsplash.com/photo-1749700332031-cf99864959ea?w=600&q=80&fm=jpg",
  "https://images.unsplash.com/photo-1628619487925-e9b8fc4c6b08?w=600&q=80&fm=jpg",
  "https://images.unsplash.com/photo-1618746647602-1384364ac94b?w=600&q=80&fm=jpg",
];

const Header = () => (
  <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-10">
      <Logo />
      <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
        <a href="#how" className="hover:text-violet-700" data-testid="landing-nav-how">How it works</a>
        <a href="#plans" className="hover:text-violet-700" data-testid="landing-nav-plans">Plans</a>
        <a href="#pricing" className="hover:text-violet-700" data-testid="landing-nav-pricing">Pricing</a>
        <a href="#creators" className="hover:text-violet-700" data-testid="landing-nav-creators">Creators</a>
      </nav>
      <div className="flex items-center gap-2">
        <Link to="/sign-in" data-testid="landing-login-button"><Button variant="ghost" className="rounded-full">Log in</Button></Link>
        <Link to="/sign-up" data-testid="landing-signup-button"><Button className="rounded-full px-5">Sign up</Button></Link>
      </div>
    </div>
  </header>
);

const Hero = () => (
  <section className="relative overflow-hidden">
    <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl" />
    <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl" />
    <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr] lg:px-10 lg:pt-20">
      <div className="rise">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" /> The marketplace for brand faces
        </span>
        <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Hire the <span className="brand-text">face</span> of your brand.
        </h1>
        <p className="mt-6 max-w-xl text-base text-slate-600 sm:text-lg">
          Find creators and presenters for your reels, shorts, ads and live sessions. Send an offer, chat, and pay safely in one place. Or join as a creator and get paid to be on camera.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/sign-up" data-testid="hero-hire-button"><Button size="lg" className="h-12 gap-2 rounded-full px-7 text-base shadow-lg shadow-violet-500/30">Find a creator <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link to="/sign-up" data-testid="hero-creator-button"><Button size="lg" variant="outline" className="h-12 gap-2 rounded-full border-violet-200 bg-white px-7 text-base"><Clapperboard className="h-4 w-4" />Become a creator</Button></Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" />Payment held until delivery</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-violet-600" />Free for creators</span>
          <span className="flex items-center gap-1.5"><IndianRupee className="h-4 w-4 text-indigo-600" />UPI, cards & netbanking</span>
        </div>
      </div>
      <div className="relative mx-auto h-[440px] w-full max-w-md sm:h-[520px]">
        <img src={HERO[0]} alt="Creator" className="absolute left-0 top-6 h-64 w-48 rounded-3xl object-cover shadow-2xl ring-4 ring-white sm:h-80 sm:w-56" />
        <img src={HERO[1]} alt="Presenter" className="absolute right-0 top-0 h-56 w-44 rounded-3xl object-cover shadow-2xl ring-4 ring-white sm:h-72 sm:w-52" />
        <img src={HERO[2]} alt="Host" className="absolute bottom-0 left-1/2 h-56 w-48 -translate-x-1/3 rounded-3xl object-cover shadow-2xl ring-4 ring-white sm:h-64 sm:w-56" />
        <div className="floaty absolute left-2 bottom-24 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-xl">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100"><Video className="h-4 w-4 text-violet-600" /></span>
          <div><p className="text-xs font-bold">New offer</p><p className="text-[11px] text-slate-500">Per Video · Reel</p></div>
        </div>
        <div className="floaty absolute right-2 top-64 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-xl" style={{ animationDelay: "1.5s" }}>
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" /><p className="text-xs font-bold">Rated by brands</p>
        </div>
      </div>
    </div>
  </section>
);

const STEPS_B = [
  { icon: Search, t: "Find your face", d: "Filter by category, city, language, plan and price." },
  { icon: Send, t: "Send an offer", d: "Pick a plan, add a short brief and your price. Creators can accept or counter." },
  { icon: ShieldCheck, t: "Pay safely", d: "Pay in the app. The money is held until you approve the finished work." },
];
const STEPS_C = [
  { icon: Clapperboard, t: "Build your profile", d: "Photo, intro video, samples and your own prices: done in 3 steps." },
  { icon: MessageCircle, t: "Get offers", d: "Brands send offers. Accept, decline or send your own price." },
  { icon: IndianRupee, t: "Get paid", d: "Deliver the work and receive your payout to UPI or bank." },
];

const How = () => (
  <section id="how" className="mx-auto max-w-7xl px-5 py-20 lg:px-10">
    <p className="text-xs font-bold uppercase tracking-widest text-violet-600">How it works</p>
    <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">One account. Hire or get hired.</h2>
    <p className="mt-3 max-w-2xl text-slate-600">Sign up once, then tap <span className="inline-grid h-6 w-6 place-items-center rounded-lg brand-gradient align-middle text-white">+</span> to become a creator, hire as a business, or both.</p>
    <div className="mt-12 grid gap-10 lg:grid-cols-2">
      {[["For businesses", STEPS_B, "from-indigo-600 to-sky-500"], ["For creators", STEPS_C, "from-violet-600 to-fuchsia-500"]].map(([title, steps, tone]) => (
        <div key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h3 className="font-heading text-xl font-bold">{title}</h3>
          <div className="mt-6 space-y-6">
            {steps.map((s, i) => (
              <div key={s.t} className="flex gap-4">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-md`}><s.icon className="h-5 w-5" /></span>
                <div><p className="font-semibold">{i + 1}. {s.t}</p><p className="text-sm text-slate-500">{s.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const Plans = () => (
  <section id="plans" className="bg-slate-950 py-20 text-white">
    <div className="mx-auto max-w-7xl px-5 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Three simple plans</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Every creator offers the same three ways to hire.</h2>
      <p className="mt-3 max-w-2xl text-slate-400">Creators set their own price for each plan, so you always see "From ₹…" up front.</p>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {PLANS.map((p, i) => (
          <div key={p.id} data-testid={`landing-plan-${p.id}`} className={`rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1 ${i === 1 ? "brand-gradient shadow-2xl shadow-violet-600/30" : "border border-white/10 bg-white/5"}`}>
            <p.icon className="h-8 w-8" />
            <h3 className="mt-5 font-heading text-2xl font-bold">{p.label}</h3>
            <p className="text-sm text-white/70">{p.short}</p>
            <p className="mt-5 text-sm font-semibold">Priced by the creator{p.unit === "/video" ? ", per video" : ", per month"}</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {p.bullets.map((b) => <li key={b} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-300" />{b}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Pricing = () => (
  <section id="pricing" className="mx-auto max-w-7xl px-5 py-20 lg:px-10">
    <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Pricing</p>
    <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Simple and fair for both sides.</h2>
    <div className="mt-12 grid gap-5 md:grid-cols-3">
      {[
        { t: "Creators", p: "Free", s: "Always", f: ["Profile & portfolio", "Receive unlimited offers", "Payouts to UPI or bank", "10% service fee per paid deal"], icon: Clapperboard },
        { t: "Business Free", p: "₹0", s: "/month", f: ["Browse & filter creators", "Shortlist favourites", "2 offers a month", "No chat or in-app payments"], icon: Search },
        { t: "Business Pro", p: "₹999", s: "/month", f: ["Unlimited offers", "Chat with creators", "Pay safely in the app", "Verified business badge"], icon: Crown, hot: true },
      ].map((x) => (
        <div key={x.t} data-testid={`pricing-${x.t.toLowerCase().replace(/ /g, "-")}`} className={`relative rounded-3xl border bg-white p-7 ${x.hot ? "border-violet-500 shadow-xl shadow-violet-500/15" : "border-slate-200"}`}>
          {x.hot && <span className="absolute -top-3 right-6 rounded-full brand-gradient px-3 py-1 text-xs font-bold text-white">Most popular</span>}
          <x.icon className="h-7 w-7 text-violet-600" />
          <h3 className="mt-4 font-heading text-xl font-bold">{x.t}</h3>
          <p className="mt-2"><span className="font-heading text-4xl font-extrabold">{x.p}</span><span className="text-slate-500"> {x.s}</span></p>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-600">{x.f.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-violet-600" />{f}</li>)}</ul>
          <Link to="/sign-up"><Button className="mt-7 w-full rounded-full" variant={x.hot ? "default" : "outline"}>Get started</Button></Link>
        </div>
      ))}
    </div>
  </section>
);

const Featured = () => {
  const [list, setList] = useState([]);
  useEffect(() => { publicApi.get("/creators", { params: { limit: 4 } }).then((r) => setList(r.data)).catch(() => {}); }, []);
  if (!list.length) return null;
  return (
    <section id="creators" className="mx-auto max-w-7xl px-5 pb-20 lg:px-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Creators</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Faces brands are hiring</h2>
        </div>
        <Link to="/sign-up" className="hidden text-sm font-semibold text-violet-700 sm:block">See all →</Link>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {list.map((c, i) => <CreatorCard key={c.user_id} c={c} index={i} to="/sign-up" />)}
      </div>
    </section>
  );
};

const FAQ = [
  ["Can I be a creator and a business?", "Yes. One account can hold both. Tap + to set up the other side and switch any time from your profile."],
  ["How does payment work?", "The business pays the agreed amount in the app. We hold it until the business approves the work, then release the payout to the creator, minus a 10% service fee."],
  ["Why are phone numbers hidden in chat?", "To keep both sides safe, contact details stay hidden until the deal is paid."],
  ["What's the difference between the plans?", "Per Video is one finished video. Part-time is up to 8 videos a month plus a live or shoot day. Full-time makes the creator your dedicated face, with up to 20 videos a month and category exclusivity."],
];

export default function Landing() {
  const { isSignedIn, isLoaded } = useAuth();
  if (isLoaded && isSignedIn) return <Navigate to="/app" replace />;
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white">
      <Header />
      <Hero />
      <How />
      <Plans />
      <Pricing />
      <Featured />
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">Questions</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQ.map(([q, a], i) => (
            <AccordionItem key={q} value={`f${i}`} data-testid={`faq-item-${i}`}>
              <AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger>
              <AccordionContent className="text-slate-600">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <section className="mx-5 mb-12 overflow-hidden rounded-[2rem] brand-gradient px-6 py-14 text-center text-white lg:mx-10">
        <h2 className="text-3xl font-bold sm:text-4xl">Ready to be seen?</h2>
        <p className="mx-auto mt-3 max-w-lg text-white/80">Join free in under a minute with Google or email.</p>
        <Link to="/sign-up" data-testid="cta-signup-button"><Button size="lg" className="mt-7 h-12 rounded-full bg-white px-8 text-violet-700 hover:bg-violet-50">Create your account</Button></Link>
      </section>
      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-slate-500 sm:flex-row lg:px-10">
          <Logo />
          <p>© {new Date().getFullYear()} HireMyFace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
