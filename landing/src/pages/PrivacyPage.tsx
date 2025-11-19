export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4 text-slate-200 leading-relaxed">
          <p>
            Locova collects minimal personal data necessary to run the app. We use your email, city preferences, and
            location (when granted) to power features like nearby trends and personalized recommendations.
          </p>
          <p>
            Your information is never sold. We only share anonymized analytics with trusted infrastructure partners for
            reliability and security.
          </p>
          <p>
            You may request deletion at any time by emailing <a className="text-brand-400" href="mailto:privacy@locova.app">privacy@locova.app</a>.
          </p>
        </section>

        <a className="inline-block mt-10 text-brand-400" href="/">← Back to home</a>
      </div>
    </main>
  );
}
