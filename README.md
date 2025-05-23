# ZMF Worker Dashboard

Production-ready worker task management system for headphone manufacturing.

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Integration**: Read-only Shopify API
- **TypeScript**: Full type safety

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   ├── worker/           # Worker dashboard
│   └── manager/          # Manager oversight
├── components/
│   ├── ui/               # shadcn/ui components
│   └── features/         # Feature-specific components
├── lib/
│   ├── supabase/         # Auth utilities
│   └── shopify/          # Read-only Shopify client
└── types/
    └── database.ts       # Generated Supabase types
```

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase and Shopify credentials
   ```

3. **Generate database types** (after setting up Supabase)
   ```bash
   npx supabase gen types typescript --project-id "$PROJECT_ID" > src/types/database.types.ts
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `SHOPIFY_STORE_URL` - Your Shopify store name
- `SHOPIFY_ACCESS_TOKEN` - Read-only Shopify access token

## Features

- 🔐 **Secure Authentication** - Supabase Auth with role-based permissions
- 📱 **Mobile-First Design** - Responsive UI for tablets and phones  
- 🛍️ **Shopify Integration** - Read-only order synchronization
- ⏱️ **Time Tracking** - Worker time logging and task management
- 🔍 **Quality Control** - QC templates and results tracking
- 📊 **Manager Dashboard** - Production oversight and reporting

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
```

## Security Notes

- ⚠️ **Shopify Integration is READ-ONLY** - Never write to Shopify
- 🔒 All API routes require authentication and employee validation
- 🛡️ Row Level Security (RLS) enabled on all database tables
- 🚫 No sensitive data stored in localStorage
- ✅ Input validation with Zod schemas

## Database Schema

Key tables:
- `employees` - User management with roles and skills
- `orders` - Synced Shopify orders (immutable)
- `order_items` - Individual products to build
- `work_tasks` - Task assignment and tracking
- `qc_templates` & `qc_results` - Quality control workflows

See `CLAUDE.md` for detailed development guidelines.