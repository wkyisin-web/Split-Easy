# Project 2

React + TanStack Start application configured for Cloudflare Workers.

## Requirements

- Node.js 22 or later
- npm (or compatible package manager)


## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the local development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview the production build:

```bash
npm run preview
```

## Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build production assets
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint
- `npm run format` - Format files with Prettier
- `npm run test` - Run unit tests with Vitest
- `npm run format:check` - Validate formatting without modifying files

## Cloudflare Workers

This project is configured for Cloudflare Workers with `wrangler.jsonc`.

Set the required secret before deploying or running worker-specific code:

```bash
npx wrangler secret put LOVABLE_API_KEY
```

Then deploy with:

```bash
npx wrangler deploy
```

Or run the worker locally with:

```bash
npx wrangler dev
```

## Notes

- `src/routeTree.gen.ts` is a generated file and is ignored by ESLint and Prettier.
- Keep `LOVABLE_API_KEY` out of source control and set it through Cloudflare secrets.
- The app uses `@tanstack/react-start` with SSR support for Cloudflare Workers.
