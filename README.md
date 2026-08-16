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

1. Add or edit `packs/{slug}/` (SVGs + `pack.json`).
2. Run `node scripts/validate.mjs`.
3. Run `node scripts/build-index.mjs` (updates `index.json`).
4. Build zip: `chmod +x scripts/pack-zip.sh && ./scripts/pack-zip.sh {slug}`.
5. Create a GitHub Release tagged `{slug}-{version}` (e.g. `delta-basics-1.0.0`) and attach `dist/{slug}.zip` as `delta-basics.zip`.
6. Confirm `index.json` `download.url` matches the release asset URL.
7. Merge to `main`. Delta sites: **Icons → Packs → Refresh** (or wait ~12h cache TTL).

## License

MIT for this repository’s original sample pack. Third-party packs must declare their own `license` in `pack.json` and keep attribution in the pack README or homepage field.
