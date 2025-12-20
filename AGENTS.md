# Repository Guidelines

## Project Structure & Module Organization

- `frontend-guide.md` is the primary documentation for the Zero Network Panel frontend integration (API endpoints, auth, environment variables).
- `package.json` holds npm metadata and scripts.
- `src/` contains the Vue app (`src/router`, `src/api`, `src/auth`, `src/modules`) and shared utilities.
- `public/` holds static assets served by Vite.
- `tests/` is not present yet; add it when automated tests are introduced.
- Keep new docs beside `frontend-guide.md`, or move to a `docs/` folder once multiple documents accumulate.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite dev server.
- `npm run build` runs type checking and builds the production bundle.
- `npm run preview` serves the production build locally for verification.

## Coding Style & Naming Conventions

- Use 2-space indentation for JSON and TypeScript to match existing formatting.
- Prefer `kebab-case` for Markdown filenames (e.g., `api-conventions.md`).
- Use `PascalCase` for Vue component names and keep file names aligned with component names.
- Keep documentation in clear, professional English and include concrete examples (commands, endpoints, or paths).

## Testing Guidelines

- There is no testing framework configured yet. When adding tests, choose a runner (e.g., Jest/Vitest) and standardize on `*.test.*` or `*.spec.*` naming.
- Place tests under `tests/` or alongside source files, and wire them to `npm test`.

## Commit & Pull Request Guidelines

- The Git history is empty, so there is no established commit convention. Use short, imperative summaries (e.g., "Add API auth notes"), and include a scope if helpful.
- PRs should include a concise description, affected paths, and any required doc updates. Add screenshots or recordings for UI changes.

## Configuration & Integration Notes

- Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`, `VITE_API_PREFIX`, and `VITE_ADMIN_PREFIX`.
- Refer to `frontend-guide.md` for API auth/refresh flows and endpoint mappings.
- Avoid storing secrets in the frontend; follow the guidance on third-party signature handling.
