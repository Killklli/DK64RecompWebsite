import base64
import io
import json
import os
import zipfile
from pathlib import Path

import requests

THUNDERSTORE_API = "https://thunderstore.io"


def main() -> None:
    with open("config.json", encoding="utf-8") as fh:
        config = json.load(fh)

    all_mods = {}
    output_file = config.get("output_file", "mods.json")

    for source in config.get("github_sources", []):
        if not source.get("enabled", True):
            continue

        repo = source.get("repo", "")
        if not repo:
            continue

        nrm_file = source.get("nrm_file", "")
        zip_name = source.get("zip_containing_nrm", "")
        token = os.environ.get("GITHUB_TOKEN")
        headers = {"Accept": "application/vnd.github+json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            release = requests.get(f"https://api.github.com/repos/{repo}/releases/latest", headers=headers, timeout=15)
            release.raise_for_status()
            release = release.json()
        except Exception:
            continue

        assets = release.get("assets", [])
        asset = None
        if zip_name:
            for item in assets:
                if item["name"] == zip_name:
                    asset = item
                    break
        if asset is None and nrm_file:
            for item in assets:
                if item["name"] == nrm_file:
                    asset = item
                    break
        if asset is None:
            for item in assets:
                if item["name"].endswith(".nrm"):
                    asset = item
                    break
        if asset is None:
            for item in assets:
                if item["name"].endswith(".zip"):
                    asset = item
                    break
        if asset is None:
            continue

        file_url = asset["browser_download_url"]

        try:
            dl_resp = requests.get(file_url, headers={**headers, "Accept": "application/octet-stream"}, timeout=120, stream=True)
            dl_resp.raise_for_status()
            nrm_bytes = b"".join(dl_resp.iter_content(chunk_size=1024 * 64))
        except Exception:
            continue

        mod_info = {}
        thumbnail = ""

        try:
            with zipfile.ZipFile(io.BytesIO(nrm_bytes)) as outer_zf:
                names_lower = {name.lower(): name for name in outer_zf.namelist()}
                nrm_entry = next((orig for lower, orig in names_lower.items() if lower.endswith(".nrm")), None)

                if nrm_entry is not None:
                    inner_bytes = outer_zf.read(nrm_entry)
                    try:
                        with zipfile.ZipFile(io.BytesIO(inner_bytes)) as inner_zf:
                            inner_names = {name.lower(): name for name in inner_zf.namelist()}
                            mod_json = inner_names.get("mod.json")
                            if mod_json:
                                mod_info = json.loads(inner_zf.read(mod_json).decode("utf-8"))
                            dds_file = inner_names.get("thumb.dds")
                            if dds_file:
                                try:
                                    from PIL import Image

                                    img = Image.open(io.BytesIO(inner_zf.read(dds_file)))
                                    buf = io.BytesIO()
                                    img.save(buf, format="PNG")
                                    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
                                    thumbnail = f"data:image/png;base64,{encoded}"
                                except Exception:
                                    encoded = base64.b64encode(inner_zf.read(dds_file)).decode("utf-8")
                                    thumbnail = f"data:image/x-dds;base64,{encoded}"
                    except zipfile.BadZipFile:
                        pass
                else:
                    for name in outer_zf.namelist():
                        if name.lower() == "mod.json":
                            mod_info = json.loads(outer_zf.read(name).decode("utf-8"))
                            break
                    for name in outer_zf.namelist():
                        if name.lower() == "thumb.dds":
                            try:
                                from PIL import Image

                                img = Image.open(io.BytesIO(outer_zf.read(name)))
                                buf = io.BytesIO()
                                img.save(buf, format="PNG")
                                encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
                                thumbnail = f"data:image/png;base64,{encoded}"
                            except Exception:
                                encoded = base64.b64encode(outer_zf.read(name)).decode("utf-8")
                                thumbnail = f"data:image/x-dds;base64,{encoded}"
                            break
        except zipfile.BadZipFile:
            continue

        version = mod_info.get("version") or release.get("tag_name", "0.0.0").lstrip("v")
        display_name = mod_info.get("display_name") or mod_info.get("id") or repo.split("/")[-1]
        mod_id = mod_info.get("id") or display_name.lower().replace(" ", "_")
        game_id = mod_info.get("game_id", "")
        short_desc = mod_info.get("short_description") or mod_info.get("description", "")
        if not short_desc:
            body = release.get("body") or ""
            short_desc = body.split("\n")[0].strip()

        all_mods[display_name] = {
            "file_url": file_url,
            "short_description": short_desc,
            "version": version,
            "id": mod_id,
            "game_id": game_id,
            "thumbnail_image": thumbnail,
        }

    for source in config.get("thunderstore_sources", []):
        if not source.get("enabled", True):
            continue

        community = source.get("community", "")
        if not community:
            continue

        game_id = source.get("game_id", "")
        filters = source.get("filters", {})
        include_nsfw = filters.get("include_nsfw", False)
        categories = [c.lower() for c in filters.get("categories", [])]
        namespaces = [n.lower() for n in filters.get("namespaces", [])]

        try:
            package_url = f"{THUNDERSTORE_API}/c/{community}/api/v1/package/"
            packages = requests.get(package_url, timeout=30)
            packages.raise_for_status()
            packages = packages.json()
        except Exception:
            try:
                package_url = f"{THUNDERSTORE_API}/api/v1/package/?community_slug={community}"
                packages = requests.get(package_url, timeout=30)
                packages.raise_for_status()
                packages = packages.json()
                if isinstance(packages, dict):
                    package_items = packages.get("results", [])
                    package_list = []
                    while True:
                        if isinstance(packages, dict):
                            package_items = packages.get("results", [])
                            package_list.extend(package_items)
                            next_url = packages.get("next")
                            if not next_url:
                                break
                            packages = requests.get(next_url, timeout=30)
                            packages.raise_for_status()
                            packages = packages.json()
                        else:
                            break
                    packages = package_list
            except Exception:
                continue

        for pkg in packages:
            if not include_nsfw and pkg.get("has_nsfw_content", False):
                continue
            if namespaces and pkg.get("owner", "").lower() not in namespaces:
                continue
            if categories:
                pkg_cats = [c.lower() for c in pkg.get("categories", [])]
                if not any(c in pkg_cats for c in categories):
                    continue

            versions = pkg.get("versions", [])
            if not versions:
                continue
            latest = versions[0]

            mod_name = pkg.get("name", "Unknown")
            namespace = pkg.get("owner", "")
            display_name = f"{namespace}/{mod_name}" if namespace else mod_name
            version = latest.get("version_number", "0.0.0")
            raw_download_url = latest.get("download_url", "")
            file_url = raw_download_url
            if raw_download_url:
                try:
                    head_resp = requests.head(raw_download_url, allow_redirects=True, timeout=15)
                    if head_resp.url != raw_download_url:
                        file_url = head_resp.url
                except Exception:
                    pass

            description = latest.get("description", pkg.get("date_created", ""))
            icon_url = latest.get("icon", "")
            mod_id = f"{namespace}_{mod_name}".lower().replace("-", "_").replace(" ", "_")

            all_mods[display_name] = {
                "file_url": file_url,
                "short_description": description,
                "version": version,
                "id": mod_id,
                "game_id": game_id,
                "thumbnail_url": icon_url,
            }

    out_path = Path(__file__).parent / output_file
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(all_mods, fh, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
