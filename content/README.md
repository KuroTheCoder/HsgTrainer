# Content

Question-bank JSON files, one per paper, in the canonical format from
[`docs/content-schema.md`](../docs/content-schema.md).

- `papers/` — one file per real paper.
- `sample.json` — **PLACEHOLDER** demo content (invented questions, do not ship as real
  material) used to smoke-test the import pipeline.

Load via the admin Bulk Import tab, or with:

```bash
node scripts/import.mjs --file content/sample.json
```
