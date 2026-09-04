(function () {
  const $ = (id) => document.getElementById(id);

  const detail = {
    modal: new bootstrap.Modal($("modDetailModal")),
    title: $("modDetailTitle"),
    img: $("modDetailImg"),
    author: $("modDetailAuthor"),
    version: $("modDetailVersion"),
    desc: $("modDetailDesc"),
    tags: $("modDetailTags"),
    download: $("modDetailDownload"),
    repo: $("modDetailRepo"),
  };

  let mods = [];
  let selectedTags = [];

  function getRepoUrl(fileUrl) {
    if (!fileUrl) return "";
    if (fileUrl.indexOf("github.com/") == -1) return "";
    return fileUrl.substring(0, fileUrl.indexOf("/releases"));
  }

  function showDetail(mod) {
    detail.title.textContent = mod.title;
    detail.img.src = mod.thumbnail || "img/Logo.png";
    detail.img.alt = `${mod.title} icon`;
    detail.author.textContent = `by ${mod.author}`;
    detail.version.textContent = mod.version ? `v${mod.version}` : "";
    detail.version.classList.toggle("d-none", !mod.version);
    const tagMarkup = (mod.tags || [])
      .filter(Boolean)
      .map((tag) => `<span class="mod-tag">${tag}</span>`)
      .join("");
    detail.tags.innerHTML = tagMarkup;
    detail.tags.classList.toggle("d-none", !tagMarkup);
    detail.desc.textContent =
      mod.short_description || "No description provided.";
    detail.download.href = mod.file_url;
    detail.download.target = "_blank";
    detail.download.rel = "noopener noreferrer";
    detail.repo.href = mod.repo_url;
    detail.repo.target = "_blank";
    detail.repo.rel = "noopener noreferrer";
    detail.modal.show();
  }

  function makeCard(mod) {
    const card = document.createElement("article");
    card.className = "mod-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details for ${mod.title}`);
    card.dataset.key = mod.key;

    card.innerHTML = `
      <div class="mod-thumb-wrap"><img loading="lazy"></div>
      <div class="mod-body">
        <div class="mod-header">
          <h3></h3>
          <span class="mod-version"></span>
        </div>
        <p class="mod-author"></p>
        <p class="mod-desc"></p>
        <div class="mod-tags"></div>
      </div>
      <div class="mod-footer">
        <a class="btn btn-success btn-sm rounded-pill text-dark">Download</a>
      </div>
    `;

    const img = card.querySelector("img");
    img.alt = `${mod.title} icon`;
    img.src = mod.thumbnail || "img/Logo.png";
    img.onerror = () => (img.src = "img/Logo.png");

    card.querySelector("h3").textContent = mod.title;
    const author = mod.author || "";
    const authorEl = card.querySelector(".mod-author");
    const suffix = author.length > 20 ? "..." : "";
    authorEl.textContent = `by ${author.slice(0, 20)}${suffix}`;
    authorEl.title = author;
    card.querySelector(".mod-desc").textContent =
      mod.short_description || "No description provided.";

    const tagsList = card.querySelector(".mod-tags");
    const tagMarkup = (mod.tags || [])
      .filter(Boolean)
      .map((tag) => `<span class="mod-tag">${tag}</span>`)
      .join("");
    if (tagMarkup) {
      tagsList.innerHTML = tagMarkup;
    } else {
      tagsList.remove();
    }

    const versionEl = card.querySelector(".mod-version");
    if (mod.version) versionEl.textContent = `v${mod.version}`;
    else versionEl.remove();

    const downloadLink = card.querySelector(".mod-footer a");
    downloadLink.href = mod.file_url;
    downloadLink.target = "_blank";
    downloadLink.rel = "noopener noreferrer";

    return card;
  }

  function findMod(key) {
    return mods.find((mod) => mod.key === key);
  }

  // one listener on the grid instead of one per card
  $("modGrid").addEventListener("click", (e) => {
    if (e.target.closest(".mod-footer")) return;
    const card = e.target.closest(".mod-card");
    const mod = card && findMod(card.dataset.key);
    if (mod) showDetail(mod);
  });

  $("modGrid").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".mod-card");
    if (!card) return;
    e.preventDefault();
    const mod = findMod(card.dataset.key);
    if (mod) showDetail(mod);
  });

  function updateTagToggleLabel() {
    if (selectedTags.length === 0) {
      $("modTagToggle").textContent = "All tags";
      return;
    }

    $("modTagToggle").textContent = selectedTags.join(", ");
  }

  function populateTagFilter() {
    const menu = $("modTagMenu");
    const allTags = [];
    mods.forEach((mod) => {
      mod.tags.forEach((tag) => {
        if (!allTags.includes(tag)) allTags.push(tag);
      });
    });
    allTags.sort();

    menu.innerHTML = "";
    allTags.forEach((tag) => {
      const label = document.createElement("label");
      label.className = "mod-tag-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = tag;
      checkbox.checked = selectedTags.includes(tag);

      const text = document.createElement("span");
      text.textContent = tag;

      label.appendChild(checkbox);
      label.appendChild(text);
      menu.appendChild(label);
    });

    if (allTags.length === 0) {
      menu.innerHTML = '<span class="mod-tag-option">No tags available</span>';
    }

    updateTagToggleLabel();
  }

  function render(list) {
    $("modGrid").replaceChildren(...list.map(makeCard));
    $("noResults").classList.toggle("d-none", list.length !== 0);
  }

  function updateCount(shown, total) {
    $("modsCount").textContent =
      shown === total
        ? `${total} mod${total === 1 ? "" : "s"} available`
        : `${shown} of ${total} mods`;
  }

  function applyFilter() {
    const query = $("modSearch").value.trim().toLowerCase();
    const filtered = mods.filter((mod) => {
      const modTags = mod.tags || [];
      const searchText =
        `${mod.title} ${mod.author} ${mod.short_description} ${modTags.join(" ")}`.toLowerCase();
      const matchesSearch = !query || searchText.includes(query);
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => modTags.includes(tag));
      return matchesSearch && matchesTags;
    });

    render(filtered);
    updateCount(filtered.length, mods.length);
  }

  $("modSearch").addEventListener("input", applyFilter);

  $("modTagMenu").addEventListener("change", (event) => {
    const input = event.target;

    if (input.checked) {
      selectedTags.push(input.value);
    } else {
      selectedTags = selectedTags.filter((tag) => tag !== input.value);
    }

    updateTagToggleLabel();
    applyFilter();
  });

  async function loadMods() {
    try {
      const res = await fetch("mods.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      mods = Object.entries(data)
        .map(([key, raw]) => {
          const mod = raw || {};
          const tags = Array.isArray(mod.tags)
            ? mod.tags
                .map((tag) => String(tag).trim().toLowerCase())
                .filter(Boolean)
            : [];
          return {
            key,
            title: key || "Unknown Mod",
            author: mod.authors || "Unknown",
            version: mod.version || "",
            short_description: mod.short_description || "",
            thumbnail: mod.thumbnail_url || mod.thumbnail_image || "",
            file_url: mod.file_url || "",
            repo_url: getRepoUrl(mod.file_url),
            tags,
          };
        })
        .sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
        );

      populateTagFilter();
      render(mods);
      updateCount(mods.length, mods.length);
    } catch (err) {
      console.error("Couldn't load mods.json:", err);
      $("modsCount").textContent = "";
      $("modsError").classList.remove("d-none");
    }
  }

  loadMods();
})();
