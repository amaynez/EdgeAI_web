# Zero Leak AI

[![Live Site](https://img.shields.io/badge/Live%20Site-zeroleak.vbliss.com.mx-00cce0?style=flat-square&logo=cloudflare&logoColor=white)](https://zeroleak.vbliss.com.mx)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Famaynez%2FEdgeAI_web)

**Zero Leak AI** is a high-performance, single-page B2B landing page for an AI data-sovereignty consulting service. It features a clean, light-mode premium aesthetic built from a logo-derived brand palette, full bilingual support (EN/ES), and an integrated AI-powered lead capture pipeline.

---

## 🚀 Features

- **Premium Light-Mode UI** — Cool blue-grey palette derived directly from the Zero Leak AI logo. Built with vanilla CSS and no Tailwind dependency.
- **Internationalization (i18n)** — Native bilingual support (EN/ES) using JSON localization files and a dynamic language switcher.
- **AI Lead Qualification** — Integrates with Google Gemini (`@google/generative-ai`) to score incoming leads and generate draft email responses on-the-fly.
- **Secure Leads Dashboard** — A protected `/leads` route using `next-auth` (Google OAuth) for reviewing captured leads, urgency timers, and AI scores.
- **Local Data Storage** — Leads saved to `data/leads.json` for simplicity; no database required.
- **Interactive Audit Form** — Multi-step modal form with success/error feedback.

---

## 🎨 Brand & Color Palette

The entire UI palette is derived from the **Zero Leak AI logo** (`/public/logo-zeroleakai.webp`). All colors are either extracted from the logo or mathematically derived from its hues using analogous color theory.

### Source Colors (from logo)

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary | **Brand Navy** | `#2d4055` | Structural elements, borders, headings |
| Primary Dark | **Brand Navy Dark** | `#1a2a3a` | Deep shadows, wordmark text |
| Secondary | **Brand Cyan** | `#00cce0` | Circuit glow, logo accent lines |
| Secondary Dark | **Brand Cyan Dark** | `#009eb0` | Hover states on cyan elements |

### Full CSS Variable Reference

```css
/* Backgrounds — tinted neutrals in the 210° cool blue family */
--bg-color:   #eef4f7;   /* page background */
--bg-card:    #f8fbfd;   /* card surfaces */
--bg-subtle:  #e2edf3;   /* inset / hover areas */

/* Text */
--text-primary:   #0d1a26;   /* navy-shifted near-black */
--text-secondary: #4a5f72;   /* mid-tone navy-grey */
--text-muted:     #9898b0;   /* de-emphasized, lavender-grey */

/* Interactive Accent (bright blue — NOT cyan, to avoid competing with logo) */
--accent:        #2e62ff;
--accent-hover:  #1e4de0;
--accent-light:  rgba(46, 98, 255, 0.08);

/* Borders */
--border-color:  #cddbe6;
--border-strong: #aac2d1;

/* Brand Colors */
--brand-navy:       #2d4055;
--brand-navy-dark:  #1a2a3a;
--brand-navy-light: rgba(45, 64, 85, 0.08);
--brand-cyan:       #00cce0;
--brand-cyan-dark:  #009eb0;
--brand-cyan-light: rgba(0, 204, 224, 0.10);
```

> See [`colorpalette.md`](./colorpalette.md) for full color theory rationale, gradient usage, do's & don'ts, and design system philosophy.

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) |
| Styling | Vanilla CSS (`globals.css`) |
| Typography | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| Authentication | `next-auth` (Google OAuth Provider) |
| AI Integration | Google Gemini (`@google/generative-ai`) |
| Email (Optional) | `nodemailer` |
| Hosting | [Vercel](https://vercel.com) |
| DNS / CDN | [Cloudflare](https://cloudflare.com) |

---

## 🛠️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/amaynez/EdgeAI_web.git
cd EdgeAI_web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env.local` file in the root of your project:

```env
# Google Gemini API
GEMINI_API_KEY="your_gemini_api_key"

# Google OAuth (NextAuth) for the /leads dashboard
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# NextAuth Configuration
NEXTAUTH_SECRET="a_strong_random_secret"
NEXTAUTH_URL="http://localhost:3000" # Change to production URL when deploying

# Email Configuration (optional — Nodemailer)
GMAIL_USER="your_email@gmail.com"
GMAIL_APP_PASSWORD="your_app_password"
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🌐 Deployment

### Vercel

The easiest way to deploy is via the [Vercel Platform](https://vercel.com).

1. Push your code to your GitHub repository.
2. Import the project into Vercel.
3. Add all environment variables from `.env.local` to your Vercel project settings.
4. Set `NEXTAUTH_URL` to your production domain (e.g., `https://zeroleak.vbliss.com.mx`).
5. Deploy.

### Google OAuth — Production Setup

After deploying, update your OAuth app in [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials:

- **Authorized JavaScript Origins**: `https://zeroleak.vbliss.com.mx`
- **Authorized Redirect URIs**: `https://zeroleak.vbliss.com.mx/api/auth/callback/google`

---

## ☁️ Cloudflare Custom Subdomain Setup

This project is served at `zeroleak.vbliss.com.mx` via a Cloudflare-managed domain.

### Prerequisites
- A domain managed by Cloudflare (e.g., `vbliss.com.mx`)
- The project deployed to Vercel

### Step 1 — Add the domain in Vercel

1. Go to your Vercel project → **Settings** → **Domains**
2. Enter `zeroleak.vbliss.com.mx` and click **Add**
3. Vercel will instruct you to add a `CNAME` record pointing to `cname.vercel-dns.com`

### Step 2 — Add DNS record in Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → select your domain
2. Go to **DNS** → **Records** → **Add Record**

| Field | Value |
|---|---|
| **Type** | `CNAME` |
| **Name** | `zeroleak` |
| **Target** | `cname.vercel-dns.com` |
| **Proxy status** | ☁️ **DNS only** (gray cloud — NOT orange) |
| **TTL** | Auto |

> **⚠️ Important:** The Cloudflare proxy (orange cloud) must be **disabled** for Vercel's automatic SSL certificate provisioning to work. Vercel handles TLS/HTTPS itself. Leave the record as DNS-only (gray cloud).

### Step 3 — Verify in Vercel

Return to Vercel → **Settings** → **Domains**. Within 1–5 minutes, Vercel will detect the CNAME and provision an SSL certificate automatically. A green checkmark ✅ confirms the domain is live.

---

## 📜 License

MIT
