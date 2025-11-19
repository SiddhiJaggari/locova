import SectionHeading from "./components/SectionHeading";

const features = [
  {
    title: "Post and discover in real time",
    description:
      "Drop a trend the moment you find it. Locova surfaces hyper-local intel so your crew never misses what is popping tonight.",
    icon: "📍",
  },
  {
    title: "Earn points, badges & perks",
    description: "Gamified missions, streaks, and tiered badges keep you exploring. Unlock rewards as you climb the leaderboard.",
    icon: "🎯",
  },
  {
    title: "Hyper-personalized feed",
    description: "Our ML engine learns from what you like, where you go, and who you vibe with to recommend the next hot drop.",
    icon: "🤖",
  },
];

const heroScreenshot =
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=70";

const screenshots = [
  {
    label: "Trend Feed",
    src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=60",
  },
  {
    label: "Map Explorer",
    src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=60",
  },
  {
    label: "Rewards",
    src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=600&q=60",
  },
];

export default function App() {
  return (
    <div className="bg-slate-950 min-h-screen text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/50 via-transparent to-slate-950 pointer-events-none" />
        <header className="relative px-6 py-12 lg:py-20 max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <p className="uppercase tracking-[0.4em] text-brand-100 text-xs mb-4">locova</p>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Discover your city’s <span className="text-brand-500">hottest trends</span>
            </h1>
            <p className="text-lg text-slate-300 mt-6">
              Locova blends real-world discovery with game mechanics so you can find hidden gems, earn rewards, and flex on the leaderboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center lg:justify-start">
              <a
                className="bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/30"
                href="https://play.google.com/store/apps/details?id=locova"
                target="_blank"
                rel="noreferrer"
              >
                Download on Play Store
              </a>
              <a
                className="border border-slate-700 px-6 py-3 rounded-xl font-semibold hover:border-brand-500 transition"
                href="https://testflight.apple.com/join/locova"
                target="_blank"
                rel="noreferrer"
              >
                Join TestFlight
              </a>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] mt-6 text-slate-500">
              Now accepting early access explorers
            </p>
          </div>
          <div className="flex-1 w-full">
            <div className="bg-slate-900 rounded-[32px] p-3 border border-slate-800 shadow-2xl shadow-brand-900/30">
              <img src={heroScreenshot} alt="Locova app preview" className="w-full rounded-[24px] object-cover" />
            </div>
          </div>
        </header>
      </div>

      <main className="px-6 pb-16">
        <section className="max-w-5xl mx-auto py-16">
          <SectionHeading
            eyebrow="Why Locova"
            title="City discovery that feels like a game"
            subtitle="We mix collaborative intel, ML recommendations, and rewards to keep you exploring IRL."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-slate-300 mt-3 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto py-16">
          <SectionHeading
            eyebrow="Screenshots"
            title="A peek inside Locova"
            subtitle="Feed, map, and rewards built for explorers."
          />
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {screenshots.map((shot) => (
              <div key={shot.label} className="bg-slate-900/70 rounded-3xl p-4 border border-slate-800">
                <img src={shot.src} alt={shot.label} className="rounded-2xl w-full" />
                <p className="text-center mt-4 text-slate-300">{shot.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto py-16">
          <SectionHeading
            eyebrow="Download"
            title="Ready to explore?"
            subtitle="Available on iOS via TestFlight and Android via Google Play."
          />
          <div className="flex flex-col sm:flex-row justify-center gap-6 mt-10">
            <a href="https://play.google.com/store/apps/details?id=locova" target="_blank" rel="noreferrer">
              <img
                className="h-16"
                src="https://developer.android.com/images/brand/en_generic_rgb_wo_45.png"
                alt="Get it on Google Play"
              />
            </a>
            <a href="https://apps.apple.com/app/locova" target="_blank" rel="noreferrer">
              <img
                className="h-16"
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
              />
            </a>
          </div>
        </section>

        <section className="max-w-3xl mx-auto py-16">
          <SectionHeading
            eyebrow="Stay in the loop"
            title="Get launch invites & city drops"
            subtitle="Join our newsletter to get trend recaps, event invites, and access codes."
          />
          <form
            className="mt-8 flex flex-col sm:flex-row gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              const email = formData.get("email");
              console.log("Newsletter sign-up", email);
              form.reset();
              alert("Thanks! We'll keep you posted about new drops.");
            }}
          >
            <input
              type="email"
              name="email"
              required
              placeholder="you@email.com"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 focus:border-brand-500 outline-none"
            />
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 transition text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-brand-500/30"
            >
              Notify me
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-3">We’ll send occasional product updates. Unsubscribe anytime.</p>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-10 text-center text-sm text-slate-400">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Locova. Built with love in your city.</p>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="hover:text-white">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-white">Terms</a>
              <span>•</span>
              <a href="mailto:hello@locova.app" className="hover:text-white">hello@locova.app</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
