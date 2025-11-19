# Locova Landing Page

A fast marketing site for Locova, built with Vite, React 19, TypeScript, and Tailwind CSS.

## Getting Started

```bash
cd landing
npm install        # already done once, re-run when deps change
npm run dev        # start local dev server on http://localhost:5173
```

## Production Build

```bash
npm run build
npm run preview    # optional smoke test of the production build
```

Vite outputs static assets into `dist/`, which is what Vercel (or any static host) will serve.

## Deploying to Vercel

1. Create a new Git repo (or subtree) for `/landing` and push it to GitHub.
2. In [vercel.com](https://vercel.com), create a new project and connect the repo.
3. Use the default Vite build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Deploy. Vercel will provision a preview URL (e.g., `https://locova.vercel.app`).
5. Optionally add a custom domain in the project settings.

## Customization Checklist

- Replace the screenshot image URLs in `src/App.tsx` with real device mockups.
- Update Play Store / App Store / TestFlight links once your listings are live.
- Wire the newsletter form to a real provider (e.g., Resend, ConvertKit, Mailchimp).
- Keep `src/pages/PrivacyPage.tsx` and `src/pages/TermsPage.tsx` in sync with your latest legal documents.
