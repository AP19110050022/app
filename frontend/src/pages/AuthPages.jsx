import { SignIn, SignUp } from "@clerk/react";
import { Video, Heart, IndianRupee, Star, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

const IMGS = [
  "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11?w=500&q=80&fm=jpg",
  "https://images.unsplash.com/photo-1598966739654-5e9a252d8c32?w=500&q=80&fm=jpg",
  "https://images.unsplash.com/photo-1595754883593-e274aaa13580?w=500&q=80&fm=jpg",
  "https://images.unsplash.com/photo-1749353709853-6ed9969b1125?w=500&q=80&fm=jpg",
];

const Bubble = ({ icon: Icon, text, className, delay }) => (
  <div className={`floaty absolute flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-slate-900 shadow-xl ${className}`} style={{ animationDelay: delay }}>
    <Icon className="h-4 w-4 text-violet-600" /><span className="text-xs font-bold">{text}</span>
  </div>
);

const Panel = () => (
  <div className="relative hidden overflow-hidden brand-gradient lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:p-12">
    <div className="grain absolute inset-0" />
    <Logo light className="relative" />
    <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4">
      {IMGS.map((src, i) => (
        <img key={src} src={src} alt="" className={`h-56 w-full rounded-3xl object-cover shadow-2xl ring-4 ring-white/20 ${i % 2 ? "translate-y-10" : ""}`} />
      ))}
      <Bubble icon={Video} text="New reel offer" className="-left-6 top-10" delay="0s" />
      <Bubble icon={IndianRupee} text="Payout released" className="-right-6 top-1/2" delay="1.2s" />
      <Bubble icon={Star} text="5★ from a brand" className="bottom-4 left-10" delay="2.4s" />
    </div>
    <div className="relative text-white">
      <h2 className="font-heading text-4xl font-extrabold leading-tight">Be the face.<br />Or find yours.</h2>
      <p className="mt-3 flex items-center gap-2 text-white/80"><Heart className="h-4 w-4" />Creators and brands, together in one app.</p>
    </div>
  </div>
);

const Shell = ({ children, testid }) => (
  <div className="flex min-h-screen bg-slate-50" data-testid={testid}>
    <Panel />
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl lg:hidden" />
      <div className="relative mb-6 flex flex-col items-center gap-2 lg:hidden">
        <Logo />
        <p className="flex items-center gap-1.5 text-sm text-slate-500"><Sparkles className="h-4 w-4 text-violet-500" />Hire creators. Get hired.</p>
      </div>
      <div className="relative">{children}</div>
    </div>
  </div>
);

export const SignInPage = () => (
  <Shell testid="sign-in-page"><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp /></Shell>
);

export const SignUpPage = () => (
  <Shell testid="sign-up-page"><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /></Shell>
);
