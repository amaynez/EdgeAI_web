# EdgeAI Web

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Famaynez%2FEdgeAI_web)

EdgeAI Web is a high-performance, single-page B2B AI consulting landing page with a brutalist, minimalist, dark-mode aesthetic. 

It provides an integrated pipeline for capturing leads, qualifying them using Google's Gemini AI, and reviewing them in a secure dashboard.

## 🚀 Features

- **Brutalist UI**: Minimalist, dark-mode aesthetic built with vanilla CSS without Tailwind CSS dependency.
- **Internationalization (i18n)**: Native bilingual support (EN/ES) using JSON localization files and a dynamic content switcher.
- **AI Lead Qualification**: Integrates with the `@google/generative-ai` SDK to analyze and qualify leads on-the-fly, generating scores and drafting potential email responses.
- **Secure Leads Dashboard**: A protected `/leads` route using `next-auth` (Google OAuth) for reviewing captured leads, their urgency based on capture timestamps, and AI-generated scores.
- **Local Data Storage**: Leads are captured and stored in a local JSON file (`data/leads.json`) for simplicity, with Nodemailer fallback available.
- **Interactive Form Feedback**: Success and error tracking for an optimal form submission user experience.

## ⚙️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Styling**: Vanilla CSS (`index.css`)
- **Authentication**: `next-auth` (Google Provider)
- **AI Integration**: Google Gemini (`@google/generative-ai`)
- **Email Delivery (Optional)**: `nodemailer`

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

Create a `.env.local` file in the root of your project and populate it with the following required environment variables:

```env
# Email Configuration (Nodemailer setup)
GMAIL_USER="your_email@gmail.com"
GMAIL_APP_PASSWORD="your_app_password"

# Google Gemini API
GEMINI_API_KEY="your_gemini_api_key"

# Google OAuth (NextAuth) for the /leads dashboard
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# NextAuth Configuration
NEXTAUTH_SECRET="a_strong_random_secret"
NEXTAUTH_URL="http://localhost:3000" # Change to production URL when deploying
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌐 Deployment & Vercel Configuration

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com).

1. Push your code to your GitHub repository.
2. Import the project into Vercel.
3. Add all the Environment Variables from your `.env.local` to your Vercel project's settings.
   > **Note**: Be sure to update the `NEXTAUTH_URL` in Vercel to your production domain (e.g., `https://your-vercel-domain.vercel.app`).
4. **Google OAuth Production Setup**:
   - Go to Google Cloud Console > APIs & Services > Credentials.
   - Update your **Authorized JavaScript Origins** to include your Vercel URL.
   - Update your **Authorized Redirect URIs** to include `https://your-vercel-domain.vercel.app/api/auth/callback/google`.
5. Deploy!

## 📜 License

MIT
