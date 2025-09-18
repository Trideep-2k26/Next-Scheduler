# Next-Scheduler 🚀

<div align="center">
  <h3>A Production-Ready AI-Powered Appointment Scheduling Platform</h3>
  <p>Built with Next.js, Supabase, Google Calendar Integration, and Intelligent AI Assistance</p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
  [![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)
</div>

---
## Demo Videos

- [Buyer Side Feature](https://www.loom.com/share/28d85b71574949fcae3c4efe9d38a68e?sid=29bff597-407d-40b3-8d68-86600590398e)  
- [Seller Side Feature](https://www.loom.com/share/2f362a9f4270462fa3a07c383e38300b?sid=56cff009-3ba6-478a-a98a-346300d59918)
- 
## 📌 Overview

**Next-Scheduler** is a full-stack appointment scheduling application designed for real-world production use. It seamlessly connects buyers and sellers through intelligent scheduling, featuring AI assistance, Google Calendar synchronization, and automated email confirmations.

### 🎯 Key Features

- **🔐 Google OAuth Authentication** - Secure sign-in with role-based access
- **🤖 AI-Powered Assistant** - Natural language scheduling and intelligent recommendations
- **📅 Google Calendar Integration** - Automatic event creation and synchronization
- **📧 Smart Email Notifications** - Automated confirmations with Google Meet links
- **⚡ Real-Time Slot Locking** - BookMyShow-style booking system
- **📱 Fully Responsive** - Optimized for mobile and desktop
- **🚀 Performance Optimized** - Redis caching and background job processing

---

## 🛠️ Technology Stack

<table>
<tr>
<td>

**Frontend & API**
- Next.js 14
- React 18
- Tailwind CSS
- NextAuth.js

</td>
<td>

**Backend & Database**
- Prisma ORM
- Supabase PostgreSQL
- Redis Caching
- Node.js API Routes

</td>
</tr>
<tr>
<td>

**Integrations**
- Google Calendar API
- Google OAuth 2.0
- Gmail SMTP
- Gemini AI (2.5 flash lite llm)

</td>
<td>

**Deployment**
- Vercel Platform
- Serverless Functions
- Edge Runtime
- CI/CD Pipeline

</td>
</tr>
</table>

---

## 📂 Project Architecture

```
frontend/
├── 📁 components/          # Reusable React components
│   ├── Layout.js          # Application shell & navigation
│   ├── SlotPicker.js      # Interactive booking calendar
│   ├── AIChatAssistant.js # AI-powered chat interface
│   └── ...
├── 📁 lib/                # Core utilities & services
│   ├── prisma.js         # Database ORM connection
│   ├── google.js         # Google APIs integration
│   ├── emailService.js   # SMTP email handling
│   └── cache.js          # Performance caching layer
├── 📁 pages/              # Next.js routing & API
│   ├── 📁 api/           # Serverless API endpoints
│   ├── 📁 dashboard/     # User dashboards
│   ├── 📁 sellers/       # Seller management
│   └── index.js          # Landing page
└── 📁 prisma/            # Database schema & migrations
```

### 🔌 API Endpoints

| Endpoint | Purpose | Features |
|----------|---------|----------|
| `/api/appointments` | Appointment management | CRUD operations, filtering |
| `/api/slots/*` | Slot management | Locking, availability, booking |
| `/api/ai/query` | AI assistance | Natural language processing |
| `/api/sellers` | Seller operations | Availability, profiles |
| `/api/auth/[...nextauth]` | Authentication | Google OAuth flow |

---

## ⚙️ Environment Setup

### 📋 Required Environment Variables

Create `.env.local` for development:

```bash
# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Database
DATABASE_URL=postgresql://username:password@db.supabase.co:5432/postgres?sslmode=require

# Email Service (Gmail SMTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=noreply@yourapp.com

# AI Integration
GEMINI_API_KEY=your_gemini_api_key

# Security
TOKEN_ENCRYPTION_KEY=your_32_character_encryption_key

# Performance & Caching
ENABLE_CACHING=true
CACHE_DEFAULT_TTL=60
AI_CACHE_TTL=30
APPOINTMENTS_CACHE_TTL=300

# Background Jobs
ENABLE_CRON_JOBS=true
ENABLE_PERFORMANCE_TRACKING=true
```

### 🔑 Getting API Keys

1. **Google OAuth & Calendar**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Calendar API and Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized domains and redirect URIs

2. **Gmail App Password**:
   - Enable 2FA on your Google account
   - Generate an App Password for Gmail
   - Use this password in `EMAIL_PASS`

3. **Gemini AI**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Generate API key for Gemini

---

## 🚀 Local Development

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/Trideep-2k26/Next-Scheduler.git
cd Next-Scheduler/frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Initialize database
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 🧪 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database
npm run db:seed      # Seed dummy data
```

---

## 🌐 Production Deployment

### Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FTrideep-2k26%2FNext-Scheduler)

#### Step-by-Step Deployment

1. **Connect Repository**
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Setup Vercel Project**
   - Connect your GitHub repository to Vercel
   - Import the project
   - Configure build settings:
     ```json
     {
       "buildCommand": "prisma generate && next build",
       "outputDirectory": ".next",
       "installCommand": "npm install"
     }
     ```

3. **Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Update `NEXTAUTH_URL` to your deployment URL:
     ```
     NEXTAUTH_URL=https://your-app-name.vercel.app
     ```

4. **Google OAuth Configuration**
   - In Google Cloud Console → OAuth 2.0 Client IDs
   - Add authorized domains:
     ```
     vercel.app
     your-custom-domain.com
     ```
   - Add redirect URIs:
     ```
     https://your-app-name.vercel.app/api/auth/callback/google
     ```

## 🎯 Features Overview

### ✅ Implemented Features

- **Authentication System**
  - Google OAuth 2.0 integration
  - Dynamic role assignment (Buyer/Seller)
  - Secure session management

- **Appointment Management**
  - Real-time slot availability
  - BookMyShow-style slot locking
  - Google Calendar synchronization
  - Email confirmations with Meet links

- **AI Assistant**
  - Natural language processing
  - Intelligent scheduling recommendations
  - Context-aware responses
  - Cached responses for performance

- **User Experience**
  - Responsive mobile-first design
  - Intuitive booking flow
  - Real-time notifications
  - Performance optimized

### 🔄 Upcoming Features

- **Enhanced AI Capabilities**
  - Voice-powered scheduling
  - Smart availability parsing
  - Predictive booking suggestions

- **Communication**
  - SMS/WhatsApp notifications
  - In-app messaging system
  - Multi-language support

- **Analytics & Insights**
  - Booking analytics dashboard
  - Revenue tracking
  - User behavior insights

- **Enterprise Features**
  - Multi-tenant support
  - Custom branding
  - Advanced integrations

---

## 🔧 Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Prisma Connection Error (P1001)** | Verify `DATABASE_URL` format and network access |
| **Google OAuth "Unauthorized"** | Check authorized domains and redirect URIs |
| **Email Delivery Fails** | Use Gmail App Passwords, not regular password |
| **Build Fails on Vercel** | Ensure `prisma generate` runs before build |
| **Calendar Events Not Created** | Verify Google Calendar API is enabled |

### Debug Mode

Enable detailed logging:

```bash
# Add to .env.local
DEBUG=true
LOG_LEVEL=verbose
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Never commit `.env` files

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js Team](https://nextjs.org/) for the amazing framework
- [Prisma](https://prisma.io/) for the excellent ORM
- [Supabase](https://supabase.com/) for managed PostgreSQL
- [Vercel](https://vercel.com/) for seamless deployment
- [Google](https://developers.google.com/) for comprehensive APIs

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/Trideep-2k26">Trideep</a></p>
  <p>
    <a href="https://github.com/Trideep-2k26/Next-Scheduler/issues">Report Bug</a> •
    <a href="https://github.com/Trideep-2k26/Next-Scheduler/issues">Request Feature</a> •
    <a href="https://github.com/Trideep-2k26/Next-Scheduler">View Source</a>
  </p>
</div>
