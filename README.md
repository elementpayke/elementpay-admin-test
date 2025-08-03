# Modern React Dashboard

This is a modern React dashboard application built with Next.js, Tailwind CSS, and shadcn/ui. It includes authentication powered by NextAuth.js and features for managing API keys.

## Getting Started

First, install the dependencies:

\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

This project uses `AUTH_SECRET` for NextAuth.js. Make sure to set it in your `.env.local` file:

\`\`\`
AUTH_SECRET="YOUR_SECRET_HERE"
\`\`\`

You can generate a strong secret using `openssl rand -base64 32`.

## Features

- User Authentication (Login, Signup, Email Verification)
- Dashboard with API Key Management
- Responsive Design
- Dark Mode Support
- Shadcn/ui Components
- Next.js App Router

## Project Structure

-   `app/`: Next.js App Router pages and API routes.
    -   `auth/`: Authentication pages (login, signup, verify-email).
    -   `dashboard/`: Main dashboard page for API key management.
    -   `api/auth/`: NextAuth.js API routes and custom authentication endpoints.
    -   `api/keys/`: API routes for managing API keys.
-   `components/`: Reusable React components.
    -   `auth/`: Authentication-related components.
    -   `dashboard/`: Dashboard-specific components.
    -   `providers/`: Context providers (Auth, React Query, Theme).
    -   `ui/`: Shadcn UI components.
-   `lib/`: Utility functions and mock database.
    -   `auth.ts`: NextAuth.js configuration.
    -   `mock-db.ts`: In-memory mock database for users and API keys.
    -   `types.ts`: TypeScript type definitions.
    -   `utils.ts`: General utility functions.
-   `public/`: Static assets.
-   `styles/`: Global CSS styles.

## Authentication Flow

1.  **Sign Up**: Users can create an account by providing a name, email, and password. A verification code is "sent" to their email (logged in the console for mock-db).
2.  **Email Verification**: Users must enter the verification code to activate their account.
3.  **Login**: After verification, users can log in with their email and password.
4.  **Dashboard Access**: Authenticated users are redirected to the dashboard to manage their API keys.

## API Key Management

-   **Create**: Generate new API keys with a given name.
-   **View**: See a list of all generated API keys, their creation date, and last used date.
-   **Regenerate**: Generate a new secret for an existing API key.
-   **Delete**: Remove an API key.

## Mock Database

For demonstration purposes, this project uses an in-memory mock database (`lib/mock-db.ts`). All user and API key data will be lost when the server restarts. For a production application, you would integrate with a real database (e.g., PostgreSQL, MongoDB, Supabase).

## Deployment

This application can be easily deployed to Vercel.

\`\`\`bash
npm run build
npm start
\`\`\`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
