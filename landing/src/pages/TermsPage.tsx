export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4 text-slate-200 leading-relaxed">
          <p>
            By using Locova you agree to follow local laws, respect other explorers, and only post genuine, safe trend
            recommendations. We reserve the right to remove content that violates these guidelines or our community
            standards.
          </p>
          <p>
            Locova is provided \"as is\" without warranties of any kind. We’re constantly iterating, which means
            features may change without notice. We are not liable for any losses resulting from app downtime or inaccurate
            user-generated content.
          </p>
        </section>

        <a className="inline-block mt-10 text-brand-400" href="/">← Back to home</a>
      </div>
    </main>
  );
}
