## Mod Submission

<!-- Thank you for contributing a mod to the DK64 Recomp Discovery registry! -->
<!-- Please fill out the relevant section(s) below. -->

### Mod Info

- **Mod name:**
- **Author(s):**
- **Short description:**
- **Link to mod (repo):**

### GitHub Release Source

```json
{
  "enabled": true,
  "repo": "Owner/Repo",
  "nrm_file": "your_mod.nrm",
  "zip_containing_nrm": "YourMod.zip"
}
```

- [ ] Repo has at least one published **Release** with the `.nrm` and/or `.zip` asset attached.
- [ ] The release asset contains a valid `mod.json` and `thumb.dds`.

### Checklist

- [ ] I added my entry to the `github_sources` array in [`config.json`](../config.json).
- [ ] I did not modify unrelated entries in `config.json`.
- [ ] I ran `python fetch_mods.py` locally to confirm my entry resolves correctly (no errors, thumbnail/description populate as expected).
- [ ] My mod is compatible with the intended Recomp project and does not contain malicious or unauthorized content.
