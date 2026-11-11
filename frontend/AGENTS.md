# Shared AgriFarm frontend conventions

For branding, palette, forms, photo controls, or journal review UI anywhere under
`frontend/`, read [`skills/agrifarm-ui/SKILL.md`](skills/agrifarm-ui/SKILL.md) and
its relevant reference. This convention applies to Owner (`src/(website)/owner/`)
and Worker/Leader (`src/(mobile)/`); respect each platform's existing layout and permissions.

Mobile role screens stay in src/(mobile)/leader and src/(mobile)/worker.
Role-specific UI components stay in src/components/{leader,worker}; shared UI stays
in src/components/common. features/{admin,owner,leader,worker} are reserved for
role-specific functionality, not screen/component copies. Auth/account mobile
screens live in src/features/{auth,account}/mobile; each also has a website folder.
src/(mobile)/[...connect_feature].tsx connects auth/account paths to those screens.
The web HTML entry is src/(website)/index.html. Owner pages and React entry files
live directly in src/(website)/owner. Owner web
components live in src/components/owner, FarmContext in src/contexts, API clients
in src/sevices, CSS in src/styles, and geometry helpers in src/utils.
Owner domain types and relationship logic live in src/features/owner; no types
directory was approved. Shared web auth/account pages live in their website
feature folders. Web TS/TSX/CSS files use _wb before the extension. Source filenames
use underscores, not hyphens. Preserve UI and API behavior when moving files.

The mobile palette in `src/styles/theme.ts` is the color source of truth.
Owner consumes its generated CSS copy and semantic web tokens. Do not import
React Native modules into the Owner Vite app.

Run npm scripts from `frontend/`. Mobile and website share the root package,
lockfile, dependencies and environment files; keep platform compiler settings
in `tsconfig.json` and `tsconfig.web.json` at this root.

Keep skills and their references in `frontend/skills/`, separate from app source.
Follow the requested edit scope. UI work must not alter backend, database,
seed/migration data, credentials, or existing API contracts.

Future frontend tests belong in frontend/test, shared across app and website.
Do not recreate per-role review directories; no test directory currently exists.
