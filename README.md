# Delta Icon Packs

Public catalog for **Delta Icon Manager** (`21press/delta`).

Sites fetch `index.json` (via jsDelivr), then **install** a pack by downloading its release zip. Installed SVGs are sanitized and stored under `uploads/21press-delta/icons/` — never hotlinked from this repo at runtime.

## Layout

```
index.json                 # catalog root (consumed by Delta)
packs/{slug}/
  pack.json
  icons/*.svg
scripts/
  validate.mjs
  build-index.mjs
  pack-zip.sh
```

## Maintainer workflow

```bash
# After editing packs/{slug}/
npm run validate
npm run build:index
npm run zip -- {slug}          # writes dist/{slug}.zip
# or one shot:
npm run prepare:pack -- {slug}
```

1. Add or edit `packs/{slug}/` (SVGs + `pack.json`).
2. `npm run validate`
3. `npm run build:index` (updates `index.json`)
4. `npm run zip -- {slug}` → `dist/{slug}.zip`
5. Create a GitHub Release tagged `{slug}-{version}` (e.g. `delta-basics-1.0.0`) and attach `dist/{slug}.zip` as `{slug}.zip`.
6. Confirm `index.json` `download.url` matches the release asset URL.
7. Merge to `main`. Delta sites: **Icons → Packs → Refresh** (or wait ~12h cache TTL).

### Heroicons (from `temp/heroicons`)

Upstream tree: `24/outline`, `24/solid`, `20/solid`, `16/solid`. Import rewrites hard-coded fills/strokes to `currentColor` and builds **four** packs (zip install flattens by basename — styles cannot share one pack):

```bash
npm run import:heroicons
npm run prepare:pack -- heroicons-outline
npm run prepare:pack -- heroicons-solid
npm run prepare:pack -- heroicons-mini
npm run prepare:pack -- heroicons-micro
```

Release tags: `heroicons-outline-1.0.0`, `heroicons-solid-1.0.0`, `heroicons-mini-1.0.0`, `heroicons-micro-1.0.0` (attach matching `dist/*.zip`).

### Tabler Icons (from `temp/tablericons`)

Upstream tree: `outline/`, `filled/`. Builds **two** packs:

```bash
npm run import:tablericons
npm run prepare:pack -- tabler-outline
npm run prepare:pack -- tabler-filled
```

Release tags: `tabler-outline-1.0.0`, `tabler-filled-1.0.0`.

> Note: outline has ~5k icons. Delta zip install allows up to 10k entries / 64 MB uncompressed.

CI runs `npm run check` (validate + rebuild index + fail if `index.json` dirty).

| Script | What |
|--------|------|
| `npm run validate` | Schema + SVG safety |
| `npm run build:index` | Regenerate `index.json` (no-op if packs unchanged) |
| `npm run build:index:force` | Always rewrite `index.json` + bump `updatedAt` |
| `npm run zip -- <slug>` | Build release zip |
| `npm run zip:basics` | Zip sample `delta-basics` |
| `npm run prepare:pack -- <slug>` | validate + index + zip |
| `npm run check` | CI gate (validate + index in sync) |

## License

MIT for this repository’s original sample pack. Third-party packs must declare their own `license` in `pack.json` and keep attribution in the pack README or homepage field.
