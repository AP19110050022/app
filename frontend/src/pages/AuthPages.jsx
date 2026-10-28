import { SignIn, SignUp } from "@clerk/react";
import { Video, IndianRupee, Star } from "lucide-react";
import { Logo } from "@/components/Logo";

const Chip = ({ icon: Icon, text, delay }) => (
  <span className="floaty glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ animationDelay: delay }}>
    <Icon className="h-3.5 w-3.5" />{text}
  </span>
);

const Shell = ({ children, testid, title }) => (
  <div className="min-h-screen text-white" data-testid={testid}>
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-5 py-10 lg:flex-row lg:justify-between">
      <div className="w-full max-w-[400px] lg:max-w-md">
        <Logo size="text-[34px]" />
        <h1 className="mt-5 text-[30px] font-extrabold leading-[1.1] tracking-tight sm:text-[40px]">{title}</h1>
        <p className="mt-3 text-[16px] text-white/80">Creators get hired to promote. Businesses find on-camera talent in minutes.</p>
        <div className="mt-5 hidden flex-wrap gap-2 sm:flex">
          <Chip icon={Video} text="New reel offer" delay="0s" />
          <Chip icon={IndianRupee} text="Payout released" delay="1s" />
          <Chip icon={Star} text="5★ from a brand" delay="2s" />
        </div>
      </div>
      <div>{children}</div>
    </div>
  </div>
);

export const SignInPage = () => (
  <Shell testid="sign-in-page" title={<>Be the face of a brand.<br />Or find yours.</>}>
    <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />
  </Shell>
);

export const SignUpPage = () => (
  <Shell testid="sign-up-page" title={<>Join HireMyFace.<br />It takes a minute.</>}>
    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
  </Shell>
);
