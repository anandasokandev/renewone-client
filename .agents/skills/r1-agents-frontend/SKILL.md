---
name: r1-agents-frontend
description: Use when implementing or repairing UI, routes, API integration, forms, authorization, or tests in the R1 Agents Angular frontend.
---

# R1 Agents frontend feature workflow

Use this workflow for changes to the R1 Agents web application. The repository root `AGENTS.md` contains general project conventions.

## 1. Trace the existing feature

- Read the relevant sections of `PROJECT.md` and `DESIGN.md`.
- Inspect the current route, component TypeScript, template, styles, service, model, and adjacent specs as applicable.
- Treat the current source as authoritative when project notes are stale. Confirm actual endpoint shapes and role behavior from the implementation or supplied API contract; do not infer them from old examples.

## 2. Implement within the Angular structure

- Keep screens as standalone components and follow the repository's lazy-loading and file-naming patterns.
- Keep HTTP requests in injectable services, request and response shapes in typed models, and view behavior in components.
- Follow the feature's established state and form approach. Prefer Angular signals and `computed()` for reactive state where they fit the surrounding code; use RxJS for HTTP streams and asynchronous composition.
- For a new protected screen, add the route under the correct agent or admin area and apply the existing guard pattern. Check `src/app/app.routes.ts` and the guard implementation before changing access.
- Use the configured environment API base. The auth interceptor attaches bearer tokens and handles unauthorized responses; inspect nearby services before adding separate auth-header logic.
- Represent loading, error, empty, and success states when a screen fetches or submits data. Preserve typed API envelopes instead of relying on untyped response casts.

## 3. Match the product UI

- Use `DESIGN.md`, `src/styles.css`, and neighboring screens as references for the Carbon-inspired interface.
- Keep a feature's HTML and CSS beside its component. Reuse existing global styles and local conventions; avoid introducing a second component or styling framework for a single feature.
- Keep controls usable with keyboard and assistive technology: use labels, semantic buttons, visible focus, and clear validation or status text.
- Check narrow layouts when changing a screen's structure or styling.

## 4. Cover and verify the change

- Add or update the colocated `.spec.ts` when behavior changes, using the existing Angular testing utilities and Vitest conventions.
- Run `npm test -- --watch=false` for relevant unit coverage and `npm run build` for compile/build verification when appropriate to the task.
- In the final summary, list the main files changed and state which checks ran and whether they passed. Do not claim a check that was not run.
