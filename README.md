# DK64 Rekongpiled Website & Mod Registry

This repository hosts the [dk64recomp.com](https://dk64recomp.com) website the project home and mods page for the **DK64 Recompiled** project. However this is also the mod registry backend that publishes the JSON file for the recomp to query.

---

## How It Works

```
config.json  ->  fetch_mods.py  ->  mods.json  -> published to the `html` branch
```

1. Mod sources are defined in [`config.json`](config.json).
2. The [`update_mods.yml`](.github/workflows/update_mods.yml) GitHub Actions workflow runs [`fetch_mods.py`](fetch_mods.py) on an hourly cron (and on every push to `main`).
3. The script fetches the latest release data from each source, extracts metadata and thumbnails from `.nrm` / `.zip` assets, and writes `mods.json`.
4. The workflow commits the site files and the freshly generated `mods.json`, then force-pushes them to the `html` branch, which is what's served at [dk64recomp.com](https://dk64recomp.com).
---

## Mod Registry Setup

### 1. `config.json`

Mod sources are configured in `config.json`:

```json
{
  "approved_tags": ["feature", "qol", "dependency"],
  "github_sources": [
    {
      "enabled": true,
      "repo": "YourOrg/YourModRepo",
      "nrm_file": "your_mod.nrm",
      "zip_containing_nrm": "YourMod.zip",
      "tags": ["feature"]
    }
  ],
  "thunderstore_sources": [
    {
      "enabled": true,
      "community": "your-community-slug",
      "game_id": "your_game_id",
      "filters": {
        "categories": [],
        "namespaces": []
      }
    }
  ],
  "output_file": "mods.json"
}
```

### `config.json` Reference

**GitHub sources**

| Field | Required | Description |
|---|---|---|
| `approved_tags` | No | Allowlist of tags that source entries are allowed to use. |
| `enabled` | No | Set to `false` to skip this source. Defaults to `true`. |
| `repo` | **Yes** | GitHub repository in `owner/repo` format. |
| `nrm_file` | No | Exact filename of the `.nrm` asset to prefer. |
| `zip_containing_nrm` | No | Exact filename of a `.zip` that contains the `.nrm` inside. |
| `tags` | No | Related tags for the mod. Must be in the `approved_tags` list. |

Asset selection priority: `zip_containing_nrm` -> `nrm_file` -> any `.nrm` -> any `.zip`.

**Thunderstore sources**

| Field | Required | Description |
|---|---|---|
| `enabled` | No | Set to `false` to skip this source. Defaults to `true`. |
| `community` | **Yes** | Thunderstore community slug (e.g. `dk64`). |
| `game_id` | No | Game identifier to tag entries with. |
| `filters.categories` | No | Allowlist of category names. Empty = all categories. |
| `filters.namespaces` | No | Allowlist of package namespaces/owners. Empty = all namespaces. |

Note: While we do have support for NSFW packages being loaded from thunderstore, as this will be the default discovery from the application, we will never allow it to be enabled here.

## Local Development

```powershell
pip install -r requirements.txt
python fetch_mods.py
python -m http.server
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `requests` | HTTP requests to the GitHub and Thunderstore APIs |
| `Pillow` | Converting `.dds` thumbnails from NRM files to PNG |
