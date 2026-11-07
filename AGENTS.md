# Agent instructions

## Project

R1 Agents is an Angular 21 single-page application for insurance agents and administrators. It uses standalone components, TypeScript, Angular Router, signals, RxJS, and `HttpClient`. See `PROJECT.md` for the wider feature map and `DESIGN.md` for visual guidance. Check the source when a document and the current implementation disagree; these reference documents can lag behind the code.

## Where to look

- `src/app/app.routes.ts`: routes, lazy-loaded screens, and route guards.
- `src/app/components/`: standalone screens and reusable UI, usually with a TypeScript file, HTML template, CSS, and colocated spec.
- `src/app/services/`: API and shared application services.
- `src/app/models/`: API and view data contracts.
- `src/app/guards/` and `src/app/interceptors/`: access checks and HTTP behavior.
- `src/environments/`: build-specific API and asset configuration.
- `src/styles.css`, component CSS, and `DESIGN.md`: global and feature-level styling guidance.

## Working conventions

- Follow the nearest existing feature's structure and naming. Components are standalone; routes commonly lazy-load them.
- Keep API calls in injectable services and use typed models. Use Angular dependency injection with `inject()` where it matches surrounding code. Use signals and `computed()` for reactive component state when consistent with the feature.
- Keep route authorization in the route configuration and existing guards. The application has separate agent and admin areas; inspect the current guard and user-role behavior before changing access.
- Keep component templates and styles alongside their component. Put or update unit specs beside the code they cover, following the existing Vitest and Angular testing patterns.
- Preserve the established Carbon-inspired visual language. Consult `DESIGN.md` and nearby screens before changing colors, typography, spacing, or corner treatments; prefer feature CSS and existing global styles over introducing another styling system.
- API URLs are configured through `src/environments/`. Treat anything bundled into frontend environment files as public; never add credentials, tokens, or private keys there.
- Do not edit generated output in `dist/`, dependency files in `node_modules/`, or Angular cache files in `.angular/` as source changes.
- Preserve pre-existing user changes, including untracked files. Do not use destructive Git commands to clean the workspace.

## Useful commands

- `npm start` — run the Angular development server.
- `npm run build` — create a production build.
- `npm test -- --watch=false` — run the unit-test suite once.

Use the narrowest useful verification for the change and report commands that were actually run.
