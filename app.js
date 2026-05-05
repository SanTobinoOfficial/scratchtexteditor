const elements = {
  shell: document.querySelector(".shell"),
  workspace: document.querySelector(".workspace"),
  projectName: document.querySelector("#projectName"),
  explorerPane: document.querySelector("#explorerPane"),
  inspectorPanel: document.querySelector("#inspectorPanel"),
  fileTree: document.querySelector("#fileTree"),
  codeEditor: document.querySelector("#codeEditor"),
  highlightLayer: document.querySelector("#highlightLayer"),
  lineNumbers: document.querySelector("#lineNumbers"),
  activeFilePath: document.querySelector("#activeFilePath"),
  activeFileMeta: document.querySelector("#activeFileMeta"),
  activeTabTitle: document.querySelector("#activeTabTitle"),
  openEditorLabel: document.querySelector("#openEditorLabel"),
  statusPill: document.querySelector("#statusPill"),
  consoleOutput: document.querySelector("#consoleOutput"),
  previewPane: document.querySelector("#previewPane"),
  projectStats: document.querySelector("#projectStats"),
  importInput: document.querySelector("#importInput"),
};

const state = {
  project: createDefaultProject(),
  selectedFileId: "source:stage-1",
  explorerVisible: true,
  inspectorVisible: true,
  flatTheme: false,
};

boot();

function boot() {
  bindUi();
  loadProject(createDefaultProject());
  logMessage("LuaScratch uruchomiony. IDE pracuje na plikach MoonLua i potrafi czytac oraz zapisywac .sb3.");
}

function bindUi() {
  elements.projectName.addEventListener("input", (event) => {
    state.project.name = event.target.value || "LuaScratch Project";
  });

  elements.codeEditor.addEventListener("input", () => {
    saveActiveFileContent(elements.codeEditor.value);
    updateLineNumbers();
    renderHighlight();
    renderPreview();
  });

  elements.codeEditor.addEventListener("scroll", () => {
    elements.lineNumbers.scrollTop = elements.codeEditor.scrollTop;
    elements.highlightLayer.scrollTop = elements.codeEditor.scrollTop;
    elements.highlightLayer.scrollLeft = elements.codeEditor.scrollLeft;
  });

  elements.codeEditor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = elements.codeEditor.selectionStart;
      const end = elements.codeEditor.selectionEnd;
      const value = elements.codeEditor.value;
      elements.codeEditor.value = `${value.slice(0, start)}  ${value.slice(end)}`;
      elements.codeEditor.selectionStart = elements.codeEditor.selectionEnd = start + 2;
      elements.codeEditor.dispatchEvent(new Event("input"));
    }
  });

  document.querySelector("#analyzeButton").addEventListener("click", analyzeProject);
  document.querySelector("#saveSb3Button").addEventListener("click", exportSb3);
  document.querySelector("#saveInternalButton").addEventListener("click", exportInternalProject);
  document.querySelector("#addFileButton").addEventListener("click", addEmptyFile);
  document.querySelector("#addSpriteButton").addEventListener("click", addSprite);
  document.querySelector("#addBackdropButton").addEventListener("click", addBackdrop);
  document.querySelector("#toggleExplorerButton").addEventListener("click", toggleExplorer);
  document.querySelector("#searchButton").addEventListener("click", searchInEditor);
  document.querySelector("#sourceControlButton").addEventListener("click", exportInternalProject);
  document.querySelector("#runButton").addEventListener("click", analyzeProject);
  document.querySelector("#toggleInspectorButton").addEventListener("click", toggleInspector);
  document.querySelector("#toggleThemeButton").addEventListener("click", toggleTheme);
  document.querySelector("#explorerMoreButton").addEventListener("click", toggleStatsPanel);
  document.querySelector("#closeTabButton").addEventListener("click", closeCurrentTab);
  document.querySelector("#clearConsoleButton").addEventListener("click", () => {
    elements.consoleOutput.textContent = "";
  });
  document.querySelector("#loadExampleButton").addEventListener("click", () => {
    loadProject(createDefaultProject());
    setStatus("Wczytano przyklad");
  });

  elements.importInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    try {
      const project = await importProject(file);
      loadProject(project);
      setStatus(`Zaimportowano ${file.name}`);
    } catch (error) {
      logMessage(`Import nieudany: ${error.message}`);
      setStatus("Blad importu");
      console.error(error);
    } finally {
      event.target.value = "";
    }
  });
}

function loadProject(project) {
  state.project = hydrateProject(project);
  const files = getVirtualFiles();
  state.selectedFileId =
    files.find((file) => file.kind === "target-source")?.id ??
    files.find((file) => file.kind === "draft-source")?.id ??
    files[0]?.id ??
    null;
  elements.projectName.value = state.project.name;
  renderAll();
}

function hydrateProject(project) {
  const hydrated = structuredClone(project);
  hydrated.meta ||= { format: "luascratch-sb", version: 2, language: "MoonLua" };
  hydrated.name ||= "LuaScratch Project";
  hydrated.looseFiles ||= [];
  hydrated.looseFiles = hydrated.looseFiles.map((file, index) => ({
    id: file.id || `draft-${index + 1}`,
    name: file.name || `untitled-${index + 1}.moon`,
    content: file.content || "",
    compile: file.compile ?? true,
  }));
  hydrated.targets ||= [];
  hydrated.targets = hydrated.targets.map((target, index) => ({
    id: target.id || `target-${index + 1}`,
    kind: target.kind || (target.isStage ? "stage" : "sprite"),
    name: target.name || (target.kind === "stage" ? "Stage" : `Sprite ${index + 1}`),
    source: target.source || defaultTargetSource(target.kind || "sprite", target.name || `Sprite ${index + 1}`),
    x: target.x ?? 0,
    y: target.y ?? 0,
    direction: target.direction ?? 90,
    size: target.size ?? 100,
    visible: target.visible ?? true,
    rotationStyle: target.rotationStyle || "all around",
    draggable: target.draggable ?? false,
    currentCostume: target.currentCostume ?? 0,
    volume: target.volume ?? 100,
    layerOrder: target.layerOrder ?? index,
    tempo: target.tempo ?? 60,
    videoTransparency: target.videoTransparency ?? 50,
    videoState: target.videoState || "on",
    textToSpeechLanguage: target.textToSpeechLanguage ?? null,
    variables: target.variables || {},
    lists: target.lists || {},
    broadcasts: target.broadcasts || {},
    sounds: (target.sounds || []).map((sound, soundIndex) => ({
      name: sound.name || `Sound ${soundIndex + 1}`,
      assetId: sound.assetId || randomAssetId(),
      dataFormat: sound.dataFormat || "wav",
      md5ext: sound.md5ext || `${sound.assetId || randomAssetId()}.${sound.dataFormat || "wav"}`,
      sampleRate: sound.sampleRate ?? 48000,
      sampleCount: sound.sampleCount ?? 1,
      data: sound.data || null,
    })),
    costumes: (target.costumes || defaultCostumesForTarget(target.kind || "sprite", target.name || `Sprite ${index + 1}`)).map(
      (costume, costumeIndex) => ({
        name: costume.name || `${target.name || "Asset"} ${costumeIndex + 1}`,
        assetId: costume.assetId || randomAssetId(),
        dataFormat: costume.dataFormat || inferDataFormat(costume.data) || "svg",
        md5ext: costume.md5ext || `${costume.assetId || randomAssetId()}.${costume.dataFormat || inferDataFormat(costume.data) || "svg"}`,
        bitmapResolution: costume.bitmapResolution ?? 1,
        rotationCenterX: costume.rotationCenterX ?? 48,
        rotationCenterY: costume.rotationCenterY ?? 48,
        data: costume.data || defaultCostumeData(target.kind || "sprite", target.name || "Sprite", costumeIndex),
      }),
    ),
  }));
  return hydrated;
}

function renderAll() {
  applyUiState();
  renderFileTree();
  renderEditor();
  renderPreview();
  renderStats();
}

function applyUiState() {
  elements.explorerPane.classList.toggle("is-hidden", !state.explorerVisible);
  elements.inspectorPanel.classList.toggle("is-hidden", !state.inspectorVisible);
  elements.shell.style.gridTemplateColumns = state.explorerVisible ? "48px 300px 1fr" : "48px 1fr";
  elements.workspace.style.gridTemplateColumns = state.inspectorVisible ? "minmax(0, 1fr) 290px" : "minmax(0, 1fr)";
  document.body.classList.toggle("theme-flat", state.flatTheme);
  document.querySelector("#toggleExplorerButton").classList.toggle("active", state.explorerVisible);
  document.querySelector("#toggleInspectorButton").classList.toggle("active", state.inspectorVisible);
  document.querySelector("#toggleThemeButton").classList.toggle("active", state.flatTheme);
}

function renderFileTree() {
  const files = getVirtualFiles();
  if (!files.some((file) => file.id === state.selectedFileId)) {
    state.selectedFileId = files[0]?.id || null;
  }

  const groups = groupBy(files, (file) => file.group);
  elements.fileTree.innerHTML = "";

  for (const [groupName, items] of Object.entries(groups)) {
    const title = document.createElement("div");
    title.className = "tree-group-title";
    title.textContent = groupName;
    elements.fileTree.appendChild(title);

    items.forEach((file) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tree-file ${state.selectedFileId === file.id ? "active" : ""}`;
      button.innerHTML = `
        <span>${escapeHtml(file.path)}</span>
        <small>${file.editable ? "edit" : "view"}</small>
      `;
      button.addEventListener("click", () => {
        state.selectedFileId = file.id;
        renderEditor();
        renderPreview();
        renderFileTree();
      });
      elements.fileTree.appendChild(button);
    });
  }
}

function renderEditor() {
  const file = getActiveFile();
  if (!file) {
    return;
  }

  elements.activeFilePath.textContent = file.path;
  elements.activeFileMeta.textContent = file.description;
  elements.activeTabTitle.textContent = file.path.split("/").at(-1) || file.path;
  elements.openEditorLabel.textContent = file.path;
  elements.codeEditor.value = file.content;
  elements.codeEditor.readOnly = !file.editable;
  elements.codeEditor.setAttribute("aria-readonly", String(!file.editable));
  updateLineNumbers();
  renderHighlight();
}

function renderPreview() {
  const file = getActiveFile();
  if (!file) {
    return;
  }

  if (file.kind === "target-meta" || file.kind === "backdrop-meta" || file.kind === "sound-meta") {
    elements.previewPane.textContent = file.content;
    return;
  }

  if (file.kind === "draft-source") {
    const summary = [
      `Szkic: ${file.path}`,
      "",
      "To jest pusty plik MoonLua.",
      "Mozesz tu napisac kod od zera, a potem przeksztalcic go w plik sceny albo duszka.",
      "Jesli plik zawiera poprawne definicje stage/sprite, zostanie uwzgledniony przy analizie.",
    ].join("\n");
    elements.previewPane.textContent = summary;
    return;
  }

  if (file.kind === "target-source") {
    const target = state.project.targets.find((entry) => entry.id === file.targetId);
    elements.previewPane.textContent = JSON.stringify(
      {
        name: target.name,
        kind: target.kind,
        x: target.x,
        y: target.y,
        direction: target.direction,
        size: target.size,
        visible: target.visible,
        costumes: target.costumes.map((costume) => costume.name),
        sounds: target.sounds.map((sound) => sound.name),
      },
      null,
      2,
    );
  }
}

function renderStats() {
  const sprites = state.project.targets.filter((target) => target.kind === "sprite");
  const stage = state.project.targets.find((target) => target.kind === "stage");
  elements.projectStats.innerHTML = `
    <span>MoonLua files: ${getVirtualFiles().filter((file) => file.editable).length}</span>
    <span>Sprites: ${sprites.length}</span>
    <span>Backdrops: ${stage?.costumes.length || 0}</span>
    <span>Drafts: ${state.project.looseFiles.length}</span>
    <span>Sounds: ${state.project.targets.reduce((sum, target) => sum + target.sounds.length, 0)}</span>
  `;
}

function getVirtualFiles() {
  const files = [];

  state.project.looseFiles.forEach((file) => {
    files.push({
      id: `draft:${file.id}`,
      draftId: file.id,
      path: `drafts/${file.name}`,
      group: "drafts",
      kind: "draft-source",
      editable: true,
      description: "Pusty lub roboczy plik MoonLua",
      content: file.content,
    });
  });

  state.project.targets.forEach((target) => {
    const folder = target.kind === "stage" ? "stage" : "sprites";
    files.push({
      id: `source:${target.id}`,
      targetId: target.id,
      path: `${folder}/${safeFileStem(target.name)}.moon`,
      group: target.kind === "stage" ? "stage" : "sprites",
      kind: "target-source",
      editable: true,
      description: `${target.kind === "stage" ? "Plik sceny" : "Plik duszka"} w MoonLua`,
      content: target.source,
    });

    files.push({
      id: `meta:${target.id}`,
      targetId: target.id,
      path: `${folder}/${safeFileStem(target.name)}.${target.kind === "stage" ? "stage" : "sprite"}.json`,
      group: target.kind === "stage" ? "stage" : "sprites",
      kind: "target-meta",
      editable: false,
      description: "Widok metadanych targetu",
      content: JSON.stringify(targetMetaView(target), null, 2),
    });

    target.sounds.forEach((sound, soundIndex) => {
      files.push({
        id: `sound:${target.id}:${soundIndex}`,
        targetId: target.id,
        path: `sounds/${safeFileStem(target.name)}/${safeFileStem(sound.name)}.sound.json`,
        group: "sounds",
        kind: "sound-meta",
        editable: false,
        description: "Widok metadanych dzwieku",
        content: JSON.stringify(soundMetaView(sound), null, 2),
      });
    });
  });

  const stage = state.project.targets.find((target) => target.kind === "stage");
  if (stage) {
    stage.costumes.forEach((backdrop, index) => {
      files.push({
        id: `backdrop:${index}`,
        path: `backdrops/${safeFileStem(backdrop.name)}.backdrop.json`,
        group: "backdrops",
        kind: "backdrop-meta",
        editable: false,
        description: "Widok metadanych tla",
        content: JSON.stringify(backdropMetaView(backdrop), null, 2),
      });
    });
  }

  return files;
}

function getActiveFile() {
  return getVirtualFiles().find((file) => file.id === state.selectedFileId) || null;
}

function saveActiveFileContent(nextContent) {
  const activeFile = getActiveFile();
  if (!activeFile || !activeFile.editable) {
    return;
  }

  if (activeFile.kind === "draft-source") {
    const file = state.project.looseFiles.find((entry) => entry.id === activeFile.draftId);
    if (file) {
      file.content = nextContent;
    }
    return;
  }

  if (activeFile.kind === "target-source") {
    const target = state.project.targets.find((entry) => entry.id === activeFile.targetId);
    if (target) {
      target.source = nextContent;
    }
  }
}

function updateLineNumbers() {
  const lineCount = elements.codeEditor.value.split("\n").length;
  elements.lineNumbers.textContent = Array.from({ length: lineCount }, (_, index) => `${index + 1}`).join("\n");
}

function renderHighlight() {
  elements.highlightLayer.innerHTML = highlightMoonLua(elements.codeEditor.value);
}

function toggleExplorer() {
  state.explorerVisible = !state.explorerVisible;
  applyUiState();
}

function toggleInspector() {
  state.inspectorVisible = !state.inspectorVisible;
  applyUiState();
}

function toggleTheme() {
  state.flatTheme = !state.flatTheme;
  applyUiState();
  setStatus(state.flatTheme ? "Motyw flat" : "Motyw domyslny");
}

function toggleStatsPanel() {
  const section = document.querySelector(".bottom-section");
  if (!section) {
    return;
  }
  section.classList.toggle("is-hidden");
}

function closeCurrentTab() {
  const files = getVirtualFiles();
  state.selectedFileId =
    files.find((file) => file.kind === "target-source")?.id ??
    files.find((file) => file.kind === "draft-source")?.id ??
    null;
  renderAll();
}

function searchInEditor() {
  const query = prompt("Szukaj w aktualnym pliku", "");
  if (!query) {
    return;
  }
  const value = elements.codeEditor.value;
  const index = value.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) {
    setStatus("Nie znaleziono");
    return;
  }
  elements.codeEditor.focus();
  elements.codeEditor.selectionStart = index;
  elements.codeEditor.selectionEnd = index + query.length;
  const line = value.slice(0, index).split("\n").length;
  setStatus(`Znaleziono w linii ${line}`);
}

function highlightMoonLua(source) {
  const lines = source.split("\n");
  return lines
    .map((line) => {
      const commentIndex = findCommentStart(line);
      const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
      const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";
      return `${tokenizeMoonLua(codePart)}${commentPart ? `<span class="tok-comment">${escapeHtml(commentPart)}</span>` : ""}`;
    })
    .join("\n");
}

function tokenizeMoonLua(code) {
  const tokenPattern =
    /"(?:[^"\\]|\\.)*"|\b(?:global|sprite|stage|do|end|when|if|then|else|repeat|forever|while|set|change|by|and|or|not|true|false|nil)\b|\b(?:flag_clicked|clicked|cloned)\b|\b(?:move|goto|glide|change_x|change_y|set_x|set_y|turn_right|turn_left|point_in_direction|point_towards|bounce|show|hide|say|think|next_costume|switch_costume|switch_backdrop|next_backdrop|set_size|change_size|wait|wait_until|log|play_sound|play_sound_until_done|stop_all_sounds|touching_edge|touching_sprite|key_pressed|mouse_x|mouse_y|backdrop_name|sprite_x|sprite_y|random|abs|floor|ceil|round|sqrt|sin|cos|stop|create_clone_of|delete_this_clone|go_to_layer|change_layer|set_volume|change_volume|show_variable|hide_variable|set_effect|change_effect|reset_timer|costume_name|costume_number|letter_of)\b(?=\s*\()|-?\b\d+(?:\.\d+)?\b|\b(?:PI)\b/g;

  let result = "";
  let lastIndex = 0;
  for (const match of code.matchAll(tokenPattern)) {
    const value = match[0];
    const index = match.index ?? 0;
    result += escapeHtml(code.slice(lastIndex, index));
    result += wrapMoonLuaToken(value);
    lastIndex = index + value.length;
  }
  result += escapeHtml(code.slice(lastIndex));
  return result;
}

function wrapMoonLuaToken(token) {
  if (/^"/.test(token)) {
    return `<span class="tok-string">${escapeHtml(token)}</span>`;
  }
  if (/^-?\d/.test(token)) {
    return `<span class="tok-number">${escapeHtml(token)}</span>`;
  }
  if (/^(PI)$/.test(token)) {
    return `<span class="tok-constant">${escapeHtml(token)}</span>`;
  }
  if (/^(flag_clicked|clicked|cloned|true|false|nil)$/.test(token)) {
    return `<span class="tok-constant">${escapeHtml(token)}</span>`;
  }
  if (/^(global|sprite|stage|do|end|when|if|then|else|repeat|forever|while|set|change|by|and|or|not)$/.test(token)) {
    return `<span class="tok-keyword">${escapeHtml(token)}</span>`;
  }
  return `<span class="tok-fn">${escapeHtml(token)}</span>`;
}

function findCommentStart(line) {
  let inString = false;
  for (let index = 0; index < line.length - 1; index += 1) {
    const char = line[index];
    const previous = line[index - 1];
    if (char === '"' && previous !== "\\") {
      inString = !inString;
    }
    if (!inString && line[index] === "-" && line[index + 1] === "-") {
      return index;
    }
  }
  return -1;
}

function addEmptyFile() {
  const suggestedName = `untitled-${state.project.looseFiles.length + 1}.moon`;
  const name = prompt("Nazwa pustego pliku", suggestedName);
  if (!name) {
    return;
  }
  const nextName = name.trim().endsWith(".moon") ? name.trim() : `${name.trim()}.moon`;
  const file = {
    id: crypto.randomUUID(),
    name: safeFileStem(nextName).replace(/_moon$/i, ".moon"),
    content: "",
    compile: true,
  };
  state.project.looseFiles.push(file);
  state.selectedFileId = `draft:${file.id}`;
  renderAll();
  setStatus("Dodano pusty plik");
}

function addSprite() {
  const name = prompt("Nazwa nowego duszka", `Duszek ${state.project.targets.filter((target) => target.kind === "sprite").length + 1}`);
  if (!name) {
    return;
  }

  const sprite = {
    id: crypto.randomUUID(),
    kind: "sprite",
    name: name.trim(),
    source: defaultTargetSource("sprite", name.trim()),
    x: 0,
    y: 0,
    direction: 90,
    size: 100,
    visible: true,
    rotationStyle: "all around",
    draggable: false,
    currentCostume: 0,
    volume: 100,
    layerOrder: state.project.targets.length,
    variables: {},
    lists: {},
    broadcasts: {},
    sounds: [],
    costumes: defaultCostumesForTarget("sprite", name.trim()),
  };

  state.project.targets.push(sprite);
  state.selectedFileId = `source:${sprite.id}`;
  renderAll();
  setStatus("Dodano duszka");
}

function addBackdrop() {
  const stage = ensureStageTarget();
  const name = prompt("Nazwa nowego tla", `Tlo ${stage.costumes.length + 1}`);
  if (!name) {
    return;
  }

  stage.costumes.push({
    name: name.trim(),
    assetId: randomAssetId(),
    dataFormat: "svg",
    md5ext: `${randomAssetId()}.svg`,
    bitmapResolution: 1,
    rotationCenterX: 240,
    rotationCenterY: 180,
    data: defaultBackdropSvg(name.trim(), stage.costumes.length),
  });

  renderAll();
  setStatus("Dodano tlo");
}

function ensureStageTarget() {
  let stage = state.project.targets.find((target) => target.kind === "stage");
  if (!stage) {
    stage = {
      id: crypto.randomUUID(),
      kind: "stage",
      name: "Stage",
      source: defaultTargetSource("stage", "Stage"),
      variables: {},
      lists: {},
      broadcasts: {},
      sounds: [],
      costumes: defaultCostumesForTarget("stage", "Stage"),
      currentCostume: 0,
      volume: 100,
      layerOrder: 0,
      tempo: 60,
      videoTransparency: 50,
      videoState: "on",
      textToSpeechLanguage: null,
    };
    state.project.targets.unshift(stage);
  }
  return stage;
}

function analyzeProject() {
  try {
    const compiled = compileProjectSources(state.project);
    synchronizeProjectFromCompilation(compiled);
    renderAll();
    setStatus("Skrypty poprawne");
    logMessage(
      `Analiza OK: ${compiled.targets.length} targetow, ${compiled.targets.reduce((sum, target) => sum + target.events.length, 0)} skryptow.`,
    );
  } catch (error) {
    setStatus("Blad analizy");
    logMessage(error.message);
    console.error(error);
  }
}

async function exportSb3() {
  try {
    const compiled = compileProjectSources(state.project);
    synchronizeProjectFromCompilation(compiled);
    const blob = await buildSb3Blob(state.project, compiled);
    downloadBlob(blob, `${safeFileStem(state.project.name)}.sb3`);
    setStatus("Wyeksportowano .sb3");
    logMessage("Eksport .sb3 zakonczony.");
  } catch (error) {
    setStatus("Blad eksportu");
    logMessage(`Eksport .sb3 nieudany: ${error.message}`);
    console.error(error);
  }
}

function exportInternalProject() {
  try {
    const payload = JSON.stringify(
      {
        meta: { format: "luascratch-sb", version: 2, language: "MoonLua" },
        name: state.project.name,
        looseFiles: state.project.looseFiles,
        targets: state.project.targets,
      },
      null,
      2,
    );
    downloadBlob(new Blob([payload], { type: "application/json" }), `${safeFileStem(state.project.name)}.sb`);
    setStatus("Wyeksportowano .sb");
  } catch (error) {
    setStatus("Blad eksportu");
    logMessage(`Eksport .sb nieudany: ${error.message}`);
  }
}

async function importProject(file) {
  if (file.name.toLowerCase().endsWith(".sb3")) {
    return await importSb3(file);
  }

  const text = await file.text();
  const parsed = JSON.parse(text);
  return hydrateProject(parsed);
}

async function importSb3(file) {
  if (!window.JSZip) {
    throw new Error("Biblioteka JSZip nie zostala zaladowana.");
  }

  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const projectJson = await zip.file("project.json")?.async("string");
  if (!projectJson) {
    throw new Error("Plik .sb3 nie zawiera project.json.");
  }

  const scratchProject = JSON.parse(projectJson);
  const targets = [];
  const stageGlobals = {};

  const stageTarget = scratchProject.targets.find((target) => target.isStage);
  if (stageTarget) {
    Object.values(stageTarget.variables || {}).forEach(([name, value]) => {
      stageGlobals[name] = value;
    });
  }

  const broadcasts = collectBroadcasts(scratchProject.targets);

  for (const scratchTarget of scratchProject.targets) {
    const kind = scratchTarget.isStage ? "stage" : "sprite";
    const source = scratchTargetToMoonLua(scratchTarget, broadcasts);
    const target = {
      id: crypto.randomUUID(),
      kind,
      name: scratchTarget.name || (kind === "stage" ? "Stage" : "Sprite"),
      source,
      x: scratchTarget.x ?? 0,
      y: scratchTarget.y ?? 0,
      direction: scratchTarget.direction ?? 90,
      size: scratchTarget.size ?? 100,
      visible: scratchTarget.visible ?? true,
      rotationStyle: scratchTarget.rotationStyle || "all around",
      draggable: scratchTarget.draggable ?? false,
      currentCostume: scratchTarget.currentCostume ?? 0,
      volume: scratchTarget.volume ?? 100,
      layerOrder: scratchTarget.layerOrder ?? 0,
      tempo: scratchTarget.tempo ?? 60,
      videoTransparency: scratchTarget.videoTransparency ?? 50,
      videoState: scratchTarget.videoState || "on",
      textToSpeechLanguage: scratchTarget.textToSpeechLanguage ?? null,
      variables: mapTargetVariables(scratchTarget.variables || {}),
      lists: mapTargetLists(scratchTarget.lists || {}),
      broadcasts: scratchTarget.broadcasts || {},
      sounds: await Promise.all((scratchTarget.sounds || []).map((sound) => importSoundAsset(zip, sound))),
      costumes: await Promise.all((scratchTarget.costumes || []).map((costume, index) => importCostumeAsset(zip, costume, kind, scratchTarget.name, index))),
    };
    targets.push(target);
  }

  return hydrateProject({
    meta: { format: "luascratch-sb", version: 2, language: "MoonLua", importedFrom: "sb3" },
    name: file.name.replace(/\.sb3$/i, ""),
    looseFiles: Object.keys(stageGlobals).length
      ? [
          {
            id: crypto.randomUUID(),
            name: "globals.moon",
            content: Object.entries(stageGlobals)
              .map(([name, value]) => `global ${name} = ${moonLiteral(value)}`)
              .join("\n"),
            compile: true,
          },
        ]
      : [],
    targets,
  });
}

async function buildSb3Blob(project, compiled) {
  if (!window.JSZip) {
    throw new Error("Biblioteka JSZip nie zostala zaladowana.");
  }

  const zip = new window.JSZip();
  const scratchProject = buildScratchProject(project, compiled);
  zip.file("project.json", JSON.stringify(scratchProject));

  for (const target of scratchProject.targets) {
    for (const costume of target.costumes || []) {
      const sourceTarget = project.targets.find((entry) => entry.name === target.name && normalizeTargetKind(entry.kind) === target.isStage);
      const costumeAsset = sourceTarget?.costumes.find((entry) => entry.name === costume.name);
      if (costumeAsset?.data) {
        addDataUrlOrTextAsset(zip, costume.md5ext, costumeAsset.data);
      }
    }
    for (const sound of target.sounds || []) {
      const sourceTarget = project.targets.find((entry) => entry.name === target.name && normalizeTargetKind(entry.kind) === target.isStage);
      const soundAsset = sourceTarget?.sounds.find((entry) => entry.name === sound.name);
      if (soundAsset?.data) {
        addDataUrlOrTextAsset(zip, sound.md5ext, soundAsset.data);
      }
    }
  }

  return await zip.generateAsync({ type: "blob" });
}

function buildScratchProject(project, compiled) {
  const targets = [];
  const stageCompiled = compiled.targets.find((target) => target.kind === "stage");
  const stageMeta = project.targets.find((target) => target.kind === "stage") || ensureStageTarget();
  const globalVariables = compiled.globals;
  const broadcastNames = collectBroadcastNames(compiled.targets);

  const compiledTargets = compiled.targets.length ? compiled.targets : [{ kind: "stage", name: "Stage", events: [] }];

  compiledTargets.forEach((compiledTarget, index) => {
    const sourceTarget =
      project.targets.find((target) => target.name === compiledTarget.name && target.kind === compiledTarget.kind) ||
      createTargetFromCompilation(compiledTarget);

    const blocks = {};
    const ctx = {
      blocks,
      nextId: 1,
      varIds: buildVariableIdIndex(globalVariables, sourceTarget.variables, sourceTarget.kind === "stage"),
      broadcastIds: buildBroadcastIdIndex(broadcastNames),
    };

    let scriptOffset = 20;
    compiledTarget.events.forEach((eventDef) => {
      buildScratchScript(eventDef, ctx, scriptOffset);
      scriptOffset += 110;
    });

    const targetJson = {
      isStage: compiledTarget.kind === "stage",
      name: sourceTarget.name,
      variables: serializeVariablesForTarget(globalVariables, sourceTarget.variables, compiledTarget.kind === "stage", ctx.varIds),
      lists: serializeListsForTarget(sourceTarget.lists),
      broadcasts: compiledTarget.kind === "stage" ? ctx.broadcastIds : {},
      blocks,
      comments: {},
      currentCostume: sourceTarget.currentCostume || 0,
      costumes: sourceTarget.costumes.map((costume) => ({
        assetId: costume.assetId,
        name: costume.name,
        md5ext: costume.md5ext,
        dataFormat: costume.dataFormat,
        bitmapResolution: costume.bitmapResolution ?? 1,
        rotationCenterX: costume.rotationCenterX ?? 48,
        rotationCenterY: costume.rotationCenterY ?? 48,
      })),
      sounds: sourceTarget.sounds.map((sound) => ({
        assetId: sound.assetId,
        name: sound.name,
        dataFormat: sound.dataFormat,
        md5ext: sound.md5ext,
        sampleCount: sound.sampleCount ?? 1,
        rate: sound.sampleRate ?? 48000,
      })),
      volume: sourceTarget.volume ?? 100,
      layerOrder: sourceTarget.layerOrder ?? index,
    };

    if (compiledTarget.kind === "stage") {
      targetJson.tempo = sourceTarget.tempo ?? 60;
      targetJson.videoTransparency = sourceTarget.videoTransparency ?? 50;
      targetJson.videoState = sourceTarget.videoState || "on";
      targetJson.textToSpeechLanguage = sourceTarget.textToSpeechLanguage ?? null;
    } else {
      targetJson.visible = sourceTarget.visible ?? true;
      targetJson.x = sourceTarget.x ?? 0;
      targetJson.y = sourceTarget.y ?? 0;
      targetJson.size = sourceTarget.size ?? 100;
      targetJson.direction = sourceTarget.direction ?? 90;
      targetJson.draggable = sourceTarget.draggable ?? false;
      targetJson.rotationStyle = sourceTarget.rotationStyle || "all around";
    }

    targets.push(targetJson);
  });

  return {
    targets,
    monitors: [],
    extensions: [],
    meta: {
      semver: "3.0.0",
      vm: "LuaScratch",
      agent: "LuaScratch IDE",
    },
  };
}

function buildScratchScript(eventDef, ctx, scriptOffset) {
  const hatId = nextScratchId(ctx);
  ctx.blocks[hatId] = createEventBlock(eventDef, hatId, scriptOffset, ctx);

  const stack = buildScratchStatementList(eventDef.body, ctx, hatId);
  ctx.blocks[hatId].next = stack.firstId;
}

function buildScratchStatementList(statements, ctx, parentId = null) {
  let firstId = null;
  let previousId = null;

  statements.forEach((statement) => {
    const blockId = buildScratchStatement(statement, ctx, previousId || parentId);
    if (!firstId) {
      firstId = blockId;
    }
    if (previousId) {
      ctx.blocks[previousId].next = blockId;
      ctx.blocks[blockId].parent = previousId;
    }
    previousId = blockId;
  });

  return { firstId, lastId: previousId };
}

function buildScratchStatement(statement, ctx, parentId) {
  const id = nextScratchId(ctx);
  const block = {
    opcode: "",
    next: null,
    parent: parentId,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: false,
  };

  switch (statement.type) {
    case "command":
      applyCommandBlock(block, statement, ctx);
      break;
    case "set":
      block.opcode = "data_setvariableto";
      block.fields.VARIABLE = [statement.name, resolveVariableId(ctx, statement.name)];
      block.inputs.VALUE = buildScratchInputFromExpression(statement.expr, ctx);
      break;
    case "change":
      block.opcode = "data_changevariableby";
      block.fields.VARIABLE = [statement.name, resolveVariableId(ctx, statement.name)];
      block.inputs.VALUE = buildScratchInputFromExpression(statement.expr, ctx);
      break;
    case "repeat":
      block.opcode = "control_repeat";
      block.inputs.TIMES = buildScratchInputFromExpression(statement.count, ctx);
      attachSubstack(block, "SUBSTACK", statement.body, ctx, id);
      break;
    case "forever":
      block.opcode = "control_forever";
      attachSubstack(block, "SUBSTACK", statement.body, ctx, id);
      break;
    case "if":
      block.opcode = statement.elseBody?.length ? "control_if_else" : "control_if";
      block.inputs.CONDITION = buildScratchInputFromExpression(statement.condition, ctx, "boolean");
      attachSubstack(block, "SUBSTACK", statement.body, ctx, id);
      if (statement.elseBody?.length) {
        attachSubstack(block, "SUBSTACK2", statement.elseBody, ctx, id);
      }
      break;
    case "while":
      block.opcode = "control_repeat_until";
      block.inputs.CONDITION = buildScratchInputFromExpression(`not (${statement.condition})`, ctx, "boolean");
      attachSubstack(block, "SUBSTACK", statement.body, ctx, id);
      break;
    default:
      block.opcode = "looks_say";
      block.inputs.MESSAGE = literalStringInput(`[unsupported ${statement.type}]`);
      break;
  }

  ctx.blocks[id] = block;
  adoptInputChildren(id, block, ctx);
  return id;
}

function applyCommandBlock(block, statement, ctx) {
  const args = statement.args;
  switch (statement.name) {
    case "move":
      block.opcode = "motion_movesteps";
      block.inputs.STEPS = buildScratchInputFromExpression(args[0], ctx);
      break;
    case "turn_right":
      block.opcode = "motion_turnright";
      block.inputs.DEGREES = buildScratchInputFromExpression(args[0], ctx);
      break;
    case "turn_left":
      block.opcode = "motion_turnleft";
      block.inputs.DEGREES = buildScratchInputFromExpression(args[0], ctx);
      break;
    case "goto":
      block.opcode = "motion_gotoxy";
      block.inputs.X = buildScratchInputFromExpression(args[0], ctx);
      block.inputs.Y = buildScratchInputFromExpression(args[1], ctx);
      break;
    case "glide":
      block.opcode = "motion_glidesecstoxy";
      block.inputs.SECS = buildScratchInputFromExpression(args[0], ctx);
      block.inputs.X = buildScratchInputFromExpression(args[1], ctx);
      block.inputs.Y = buildScratchInputFromExpression(args[2], ctx);
      break;
    case "change_x":
      block.opcode = "motion_changexby";
      block.inputs.DX = buildScratchInputFromExpression(args[0], ctx);
      break;
    case "change_y":
      block.opcode = "motion_changeyby";
      block.inputs.DY = buildScratchInputFromExpression(args[0], ctx);
      break;
    case "set_x":
      block.opcode = "motion_setx";
      block.inputs.X = buildScratchInputFromExpression(args[0], ctx);
      break;
    case "set_y":
      block.opcode = "motion_sety";
      block.inputs.Y = buildScratchInputFromExpression(args[0], ctx);
      break;
    case "point_in_direction":
      block.opcode = "motion_pointindirection";
      block.inputs.DIRECTION = buildScratchInputFromExpression(args[0], ctx);
      break;
    case "point_towards":
      block.opcode = "motion_pointtowards";
      block.inputs.TOWARDS = buildMenuInput(ctx, block, "motion_pointtowards_menu", "TOWARDS", scratchMenuValue("pointTowards", args[0]));
      break;
    case "bounce":
      block.opcode = "motion_ifonedgebounce";
      break;
    case "say":
      block.opcode = Number(normalizeExpression(args[1] || "0")) > 0 ? "looks_sayforsecs" : "looks_say";
      block.inputs.MESSAGE = buildScratchInputFromExpression(args[0], ctx, "string");
      if (block.opcode === "looks_sayforsecs") {
        block.inputs.SECS = buildScratchInputFromExpression(args[1], ctx);
      }
      break;
    case "think":
      block.opcode = Number(normalizeExpression(args[1] || "0")) > 0 ? "looks_thinkforsecs" : "looks_think";
      block.inputs.MESSAGE = buildScratchInputFromExpression(args[0], ctx, "string");
      if (block.opcode === "looks_thinkforsecs") {
        block.inputs.SECS = buildScratchInputFromExpression(args[1], ctx);
      }
      break;
      case "show":
        block.opcode = "looks_show";
        break;
      case "hide":
        block.opcode = "looks_hide";
        break;
      case "set_effect":
        block.opcode = "looks_seteffectto";
        block.fields.EFFECT = [stripQuotes(args[0] || "color"), null];
        block.inputs.VALUE = buildScratchInputFromExpression(args[1] || "0", ctx);
        break;
      case "change_effect":
        block.opcode = "looks_changeeffectby";
        block.fields.EFFECT = [stripQuotes(args[0] || "color"), null];
        block.inputs.CHANGE = buildScratchInputFromExpression(args[1] || "0", ctx);
        break;
      case "next_costume":
        block.opcode = "looks_nextcostume";
        break;
    case "switch_costume":
      block.opcode = "looks_switchcostumeto";
      block.inputs.COSTUME = buildMenuInput(ctx, block, "looks_costume", "COSTUME", stripQuotes(args[0] || ""));
      break;
    case "switch_backdrop":
      block.opcode = "looks_switchbackdropto";
      block.inputs.BACKDROP = buildMenuInput(ctx, block, "looks_backdrops", "BACKDROP", stripQuotes(args[0] || ""));
      break;
    case "next_backdrop":
      block.opcode = "looks_nextbackdrop";
      break;
      case "wait":
        block.opcode = "control_wait";
        block.inputs.DURATION = buildScratchInputFromExpression(args[0], ctx);
        break;
      case "wait_until":
        block.opcode = "control_wait_until";
        block.inputs.CONDITION = buildScratchInputFromExpression(args[0], ctx, "boolean");
        break;
      case "broadcast":
        block.opcode = "event_broadcast";
        block.inputs.BROADCAST_INPUT = buildBroadcastInput(args[0], ctx);
        break;
      case "stop":
        block.opcode = "control_stop";
        block.fields.STOP_OPTION = [stripQuotes(args[0] || "all"), null];
        break;
      case "create_clone_of":
        block.opcode = "control_create_clone_of";
        block.inputs.CLONE_OPTION = buildMenuInput(ctx, block, "control_create_clone_of_menu", "CLONE_OPTION", scratchCloneValue(args[0]));
        break;
      case "delete_this_clone":
        block.opcode = "control_delete_this_clone";
        break;
      case "play_sound":
        block.opcode = "sound_play";
        block.inputs.SOUND_MENU = buildMenuInput(ctx, block, "sound_sounds_menu", "SOUND_MENU", stripQuotes(args[0] || ""));
        break;
      case "play_sound_until_done":
        block.opcode = "sound_playuntildone";
        block.inputs.SOUND_MENU = buildMenuInput(ctx, block, "sound_sounds_menu", "SOUND_MENU", stripQuotes(args[0] || ""));
        break;
      case "stop_all_sounds":
        block.opcode = "sound_stopallsounds";
        break;
      case "set_volume":
        block.opcode = "sound_setvolumeto";
        block.inputs.VOLUME = buildScratchInputFromExpression(args[0], ctx);
        break;
      case "change_volume":
        block.opcode = "sound_changevolumeby";
        block.inputs.VOLUME = buildScratchInputFromExpression(args[0], ctx);
        break;
      case "reset_timer":
        block.opcode = "sensing_resettimer";
        break;
      case "set_size":
        block.opcode = "looks_setsizeto";
        block.inputs.SIZE = buildScratchInputFromExpression(args[0], ctx);
        break;
      case "change_size":
        block.opcode = "looks_changesizeby";
        block.inputs.CHANGE = buildScratchInputFromExpression(args[0], ctx);
        break;
      case "go_to_layer":
        block.opcode = "looks_gotofrontback";
        block.fields.FRONT_BACK = [stripQuotes(args[0] || "front"), null];
        break;
      case "change_layer":
        block.opcode = "looks_goforwardbackwardlayers";
        block.fields.FORWARD_BACKWARD = [stripQuotes(args[0] || "forward"), null];
        block.inputs.NUM = buildScratchInputFromExpression(args[1] || "1", ctx);
        break;
      case "show_variable":
        block.opcode = "data_showvariable";
        block.fields.VARIABLE = [stripQuotes(args[0] || ""), resolveVariableId(ctx, stripQuotes(args[0] || ""))];
        break;
      case "hide_variable":
        block.opcode = "data_hidevariable";
        block.fields.VARIABLE = [stripQuotes(args[0] || ""), resolveVariableId(ctx, stripQuotes(args[0] || ""))];
        break;
      default:
        block.opcode = "looks_say";
        block.inputs.MESSAGE = literalStringInput(`[unsupported ${statement.name}]`);
        break;
  }
}

function createEventBlock(eventDef, hatId, scriptOffset, ctx) {
  const block = {
    opcode: "event_whenflagclicked",
    next: null,
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 24,
    y: scriptOffset,
  };

  switch (eventDef.type) {
    case "flag_clicked":
      block.opcode = "event_whenflagclicked";
      break;
    case "clicked":
      block.opcode = "event_whenthisspriteclicked";
      break;
    case "cloned":
      block.opcode = "control_start_as_clone";
      break;
    case "key":
      block.opcode = "event_whenkeypressed";
      block.fields.KEY_OPTION = [eventDef.value, null];
      break;
    case "backdrop":
      block.opcode = "event_whenbackdropswitchesto";
      block.fields.BACKDROP = [eventDef.value, null];
      break;
    case "broadcast":
      block.opcode = "event_whenbroadcastreceived";
      block.fields.BROADCAST_OPTION = [eventDef.value, ctx.broadcastIds[eventDef.value] || eventDef.value];
      break;
    default:
      block.opcode = "event_whenflagclicked";
      break;
  }

  return block;
}

function attachSubstack(block, inputName, statements, ctx, parentId) {
  const substack = buildScratchStatementList(statements, ctx, parentId);
  if (substack.firstId) {
    block.inputs[inputName] = [2, substack.firstId];
  }
}

function buildScratchInputFromExpression(expr, ctx, expected = "number") {
  const normalized = normalizeExpression(expr);

  if (isQuotedString(normalized)) {
    return literalStringInput(stripQuotes(normalized));
  }

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return literalNumberInput(Number(normalized));
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    const reporterId = nextScratchId(ctx);
    ctx.blocks[reporterId] = {
      opcode: "data_variable",
      next: null,
      parent: null,
      inputs: {},
      fields: {
        VARIABLE: [normalized, resolveVariableId(ctx, normalized)],
      },
      shadow: false,
      topLevel: false,
    };
    return [3, reporterId, literalFallbackFor(expected)];
  }

  const fnMatch = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
  if (fnMatch) {
    const reporter = buildFunctionReporter(fnMatch[1], splitArguments(fnMatch[2]), ctx, expected);
    if (reporter) {
      return reporter;
    }
  }

  const binary = parseSimpleBinaryExpression(normalized);
  if (binary) {
    const reporterId = nextScratchId(ctx);
    ctx.blocks[reporterId] = {
      opcode: binaryOpcode(binary.operator),
      next: null,
      parent: null,
      inputs: {
        OPERAND1: buildScratchInputFromExpression(binary.left, ctx),
        OPERAND2: buildScratchInputFromExpression(binary.right, ctx),
      },
      fields: {},
      shadow: false,
      topLevel: false,
    };
    const leftRightInputNames = operatorInputNames(binary.operator);
    if (leftRightInputNames) {
      ctx.blocks[reporterId].inputs = {
        [leftRightInputNames[0]]: buildScratchInputFromExpression(binary.left, ctx),
        [leftRightInputNames[1]]: buildScratchInputFromExpression(binary.right, ctx),
      };
    }
    return [3, reporterId, literalFallbackFor(expected)];
  }

  return expected === "string" ? literalStringInput(normalized) : literalNumberInput(0);
}

function buildFunctionReporter(name, args, ctx, expected) {
  const reporterId = nextScratchId(ctx);
  let block = null;

  switch (name) {
    case "touching_edge":
      block = {
        opcode: "sensing_touchingobject",
        next: null,
        parent: null,
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false,
      };
      block.inputs.TOUCHINGOBJECTMENU = buildMenuInput(ctx, block, "sensing_touchingobjectmenu", "TOUCHINGOBJECTMENU", "_edge_");
      break;
    case "touching_sprite":
      block = {
        opcode: "sensing_touchingobject",
        next: null,
        parent: null,
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false,
      };
      block.inputs.TOUCHINGOBJECTMENU = buildMenuInput(
        ctx,
        block,
        "sensing_touchingobjectmenu",
        "TOUCHINGOBJECTMENU",
        stripQuotes(args[0] || ""),
      );
      break;
    case "key_pressed":
      block = {
        opcode: "sensing_keypressed",
        next: null,
        parent: null,
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false,
      };
      block.inputs.KEY_OPTION = buildMenuInput(ctx, block, "sensing_keyoptions", "KEY_OPTION", stripQuotes(args[0] || ""));
      break;
    case "mouse_x":
      block = { opcode: "sensing_mousex", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: false };
      break;
    case "mouse_y":
      block = { opcode: "sensing_mousey", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: false };
      break;
    case "backdrop_name":
      block = { opcode: "looks_backdropsnumbername", next: null, parent: null, inputs: {}, fields: { NUMBER_NAME: ["name", null] }, shadow: false, topLevel: false };
      break;
    case "sprite_x":
      block = { opcode: "motion_xposition", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: false };
      break;
    case "sprite_y":
      block = { opcode: "motion_yposition", next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: false };
      break;
    case "random":
      block = {
        opcode: "operator_random",
        next: null,
        parent: null,
        inputs: {
          FROM: buildScratchInputFromExpression(args[0], ctx),
          TO: buildScratchInputFromExpression(args[1], ctx),
        },
        fields: {},
        shadow: false,
        topLevel: false,
      };
      break;
    case "letter_of":
      block = {
        opcode: "operator_letter_of",
        next: null,
        parent: null,
        inputs: {
          LETTER: buildScratchInputFromExpression(args[0], ctx),
          STRING: buildScratchInputFromExpression(args[1], ctx, "string"),
        },
        fields: {},
        shadow: false,
        topLevel: false,
      };
      break;
    case "costume_name":
      block = {
        opcode: "looks_costumenumbername",
        next: null,
        parent: null,
        inputs: {},
        fields: { NUMBER_NAME: ["name", null] },
        shadow: false,
        topLevel: false,
      };
      break;
    case "costume_number":
      block = {
        opcode: "looks_costumenumbername",
        next: null,
        parent: null,
        inputs: {},
        fields: { NUMBER_NAME: ["number", null] },
        shadow: false,
        topLevel: false,
      };
      break;
    default:
      return null;
  }

  ctx.blocks[reporterId] = block;
  adoptInputChildren(reporterId, block, ctx);
  return [3, reporterId, literalFallbackFor(expected)];
}

function buildBroadcastInput(expr, ctx) {
  const name = stripQuotes(normalizeExpression(expr));
  const id = ctx.broadcastIds[name] || name;
  return [1, [11, name, id]];
}

function literalStringInput(value) {
  return [1, [10, value ?? ""]];
}

function literalNumberInput(value) {
  return [1, [4, Number.isFinite(Number(value)) ? Number(value) : 0]];
}

function literalFallbackFor(expected) {
  return expected === "string" ? [10, ""] : [4, 0];
}

function parseSimpleBinaryExpression(expr) {
  const operators = ["==", ">=", "<=", ">", "<", "+", "-", "*", "/", "and", "or"];
  for (const operator of operators) {
    const index = findTopLevelOperator(expr, operator);
    if (index > 0) {
      return {
        left: expr.slice(0, index).trim(),
        operator,
        right: expr.slice(index + operator.length).trim(),
      };
    }
  }

  const notMatch = expr.match(/^not\s+\((.+)\)$/);
  if (notMatch) {
    return { left: notMatch[1], operator: "not", right: "" };
  }

  return null;
}

function binaryOpcode(operator) {
  return {
    "+": "operator_add",
    "-": "operator_subtract",
    "*": "operator_multiply",
    "/": "operator_divide",
    ">": "operator_gt",
    "<": "operator_lt",
    "==": "operator_equals",
    and: "operator_and",
    or: "operator_or",
    not: "operator_not",
  }[operator];
}

function operatorInputNames(operator) {
  return {
    "+": ["NUM1", "NUM2"],
    "-": ["NUM1", "NUM2"],
    "*": ["NUM1", "NUM2"],
    "/": ["NUM1", "NUM2"],
    ">": ["OPERAND1", "OPERAND2"],
    "<": ["OPERAND1", "OPERAND2"],
    "==": ["OPERAND1", "OPERAND2"],
    and: ["OPERAND1", "OPERAND2"],
    or: ["OPERAND1", "OPERAND2"],
  }[operator] || null;
}

function compileProjectSources(project) {
  const source = [
    ...project.looseFiles.filter((file) => file.compile).map((file) => file.content),
    ...project.targets.map((target) => target.source),
  ]
    .filter(Boolean)
    .join("\n\n");
  return compileMoonLua(source);
}

function compileMoonLua(source) {
  const lines = source.split("\n");
  const parser = { lines, index: 0 };
  const compiled = { globals: {}, targets: [] };

  while (parser.index < lines.length) {
    const line = normalizeLine(lines[parser.index]);
    if (!line) {
      parser.index += 1;
      continue;
    }

    if (/^global\s+/.test(line)) {
      const match = line.match(/^global\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!match) {
        throw parserError(parser.index, "Nieprawidlowa deklaracja global.");
      }
      compiled.globals[match[1]] = evaluateStaticExpression(match[2]);
      parser.index += 1;
      continue;
    }

    const targetMatch = line.match(/^(sprite|stage)\s+"([^"]+)"\s+do$/);
    if (targetMatch) {
      parser.index += 1;
      compiled.targets.push(parseTarget(parser, targetMatch[1], targetMatch[2]));
      continue;
    }

    throw parserError(parser.index, `Nieznana instrukcja top-level: ${line}`);
  }

  return compiled;
}

function parseTarget(parser, kind, name) {
  const targetDefinition = { kind, name, events: [] };

  while (parser.index < parser.lines.length) {
    const line = normalizeLine(parser.lines[parser.index]);
    if (!line) {
      parser.index += 1;
      continue;
    }

    if (line === "end") {
      parser.index += 1;
      return targetDefinition;
    }

    const eventDef = parseEventHeader(line, parser.index);
    if (!eventDef) {
      throw parserError(parser.index, `Oczekiwano when ... do, dostano: ${line}`);
    }

    parser.index += 1;
    eventDef.body = parseStatements(parser);
    targetDefinition.events.push(eventDef);
  }

  throw parserError(parser.index - 1, `Brakuje end dla targetu ${name}`);
}

function parseStatements(parser) {
  const body = [];

  while (parser.index < parser.lines.length) {
    const line = normalizeLine(parser.lines[parser.index]);
    if (!line) {
      parser.index += 1;
      continue;
    }

    if (line === "end" || line === "else") {
      parser.index += 1;
      return body;
    }

    const repeatMatch = line.match(/^repeat\((.+)\)\s+do$/);
    if (repeatMatch) {
      parser.index += 1;
      body.push({ type: "repeat", count: repeatMatch[1], body: parseStatements(parser) });
      continue;
    }

    if (line === "forever do") {
      parser.index += 1;
      body.push({ type: "forever", body: parseStatements(parser) });
      continue;
    }

    const ifMatch = line.match(/^if\s+(.+)\s+then$/);
    if (ifMatch) {
      parser.index += 1;
      const thenBody = parseStatements(parser);
      let elseBody = null;
      const previousLine = normalizeLine(parser.lines[parser.index - 1] || "");
      if (previousLine === "else") {
        elseBody = parseStatements(parser);
      }
      body.push({ type: "if", condition: ifMatch[1], body: thenBody, elseBody });
      continue;
    }

    const whileMatch = line.match(/^while\s+(.+)\s+do$/);
    if (whileMatch) {
      parser.index += 1;
      body.push({ type: "while", condition: whileMatch[1], body: parseStatements(parser) });
      continue;
    }

    const setMatch = line.match(/^set\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
    if (setMatch) {
      body.push({ type: "set", name: setMatch[1], expr: setMatch[2] });
      parser.index += 1;
      continue;
    }

    const changeMatch = line.match(/^change\s+([A-Za-z_][A-Za-z0-9_]*)\s+by\s+(.+)$/);
    if (changeMatch) {
      body.push({ type: "change", name: changeMatch[1], expr: changeMatch[2] });
      parser.index += 1;
      continue;
    }

    const command = parseCommand(line);
    if (command) {
      body.push(command);
      parser.index += 1;
      continue;
    }

    throw parserError(parser.index, `Nieznana instrukcja: ${line}`);
  }

  throw parserError(parser.index - 1, "Brakuje end dla bloku.");
}

function parseEventHeader(line, lineIndex) {
  if (line === "when flag_clicked do") {
    return { type: "flag_clicked", value: null, body: [] };
  }
  if (line === "when clicked do") {
    return { type: "clicked", value: null, body: [] };
  }
  if (line === "when cloned do") {
    return { type: "cloned", value: null, body: [] };
  }

  const keyMatch = line.match(/^when key\("([^"]+)"\)\s+do$/);
  if (keyMatch) {
    return { type: "key", value: keyMatch[1], body: [] };
  }

  const backdropMatch = line.match(/^when backdrop\("([^"]+)"\)\s+do$/);
  if (backdropMatch) {
    return { type: "backdrop", value: backdropMatch[1], body: [] };
  }

  const broadcastMatch = line.match(/^when broadcast\("([^"]+)"\)\s+do$/);
  if (broadcastMatch) {
    return { type: "broadcast", value: broadcastMatch[1], body: [] };
  }

  if (/^when\s+/.test(line)) {
    throw parserError(lineIndex, `Nieobslugiwane zdarzenie: ${line}`);
  }

  return null;
}

function parseCommand(line) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
  if (!match) {
    return null;
  }
  return {
    type: "command",
    name: match[1],
    args: splitArguments(match[2]),
  };
}

function scratchTargetToMoonLua(target, broadcasts) {
  const lines = [];
  lines.push(`${target.isStage ? "stage" : "sprite"} "${target.name}" do`);

  const blocks = target.blocks || {};
  const hats = Object.values(blocks)
    .filter((block) => block.topLevel && isHatBlock(block.opcode))
    .sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));

  if (!hats.length) {
    lines.push("  -- brak skryptow");
  }

  hats.forEach((hat) => {
    lines.push(...translateHatScriptToMoonLua(hat, blocks, broadcasts));
  });

  lines.push("end");
  return lines.join("\n");
}

function translateHatScriptToMoonLua(hat, blocks, broadcasts) {
  const lines = [];
  const header = translateHatBlock(hat, broadcasts);
  lines.push(`  ${header}`);
  let currentId = hat.next;
  while (currentId) {
    lines.push(...translateStackBlock(blocks[currentId], blocks, 2, broadcasts));
    currentId = blocks[currentId]?.next || null;
  }
  lines.push("  end");
  return lines;
}

function translateHatBlock(block, broadcasts) {
  switch (block.opcode) {
    case "event_whenflagclicked":
      return "when flag_clicked do";
    case "event_whenkeypressed":
      return `when key("${fieldValue(block, "KEY_OPTION", "space")}") do`;
    case "event_whenthisspriteclicked":
      return "when clicked do";
    case "control_start_as_clone":
      return "when cloned do";
    case "event_whenbackdropswitchesto":
      return `when backdrop("${fieldValue(block, "BACKDROP", "")}") do`;
    case "event_whenbroadcastreceived":
      return `when broadcast("${fieldValue(block, "BROADCAST_OPTION", "")}") do`;
    default:
      return `when broadcast("unsupported:${block.opcode}") do`;
  }
}

function translateStackBlock(block, blocks, indentLevel, broadcasts) {
  if (!block) {
    return [];
  }

  const indent = "  ".repeat(indentLevel);
  const lines = [];
  const reporter = (name) => translateScratchInput(block.inputs?.[name], blocks, broadcasts);

  switch (block.opcode) {
    case "motion_movesteps":
      lines.push(`${indent}move(${reporter("STEPS")})`);
      break;
    case "motion_turnright":
      lines.push(`${indent}turn_right(${reporter("DEGREES")})`);
      break;
    case "motion_turnleft":
      lines.push(`${indent}turn_left(${reporter("DEGREES")})`);
      break;
    case "motion_gotoxy":
      lines.push(`${indent}goto(${reporter("X")}, ${reporter("Y")})`);
      break;
    case "motion_glidesecstoxy":
      lines.push(`${indent}glide(${reporter("SECS")}, ${reporter("X")}, ${reporter("Y")})`);
      break;
    case "motion_changexby":
      lines.push(`${indent}change_x(${reporter("DX")})`);
      break;
    case "motion_setx":
      lines.push(`${indent}set_x(${reporter("X")})`);
      break;
    case "motion_changeyby":
      lines.push(`${indent}change_y(${reporter("DY")})`);
      break;
    case "motion_sety":
      lines.push(`${indent}set_y(${reporter("Y")})`);
      break;
    case "motion_pointindirection":
      lines.push(`${indent}point_in_direction(${reporter("DIRECTION")})`);
      break;
    case "motion_pointtowards":
      lines.push(`${indent}point_towards(${reporter("TOWARDS")})`);
      break;
    case "motion_ifonedgebounce":
      lines.push(`${indent}bounce()`);
      break;
    case "looks_say":
      lines.push(`${indent}say(${reporter("MESSAGE")}, 0)`);
      break;
    case "looks_sayforsecs":
      lines.push(`${indent}say(${reporter("MESSAGE")}, ${reporter("SECS")})`);
      break;
    case "looks_think":
      lines.push(`${indent}think(${reporter("MESSAGE")}, 0)`);
      break;
    case "looks_thinkforsecs":
      lines.push(`${indent}think(${reporter("MESSAGE")}, ${reporter("SECS")})`);
      break;
    case "looks_show":
      lines.push(`${indent}show()`);
      break;
    case "looks_hide":
      lines.push(`${indent}hide()`);
      break;
    case "looks_seteffectto":
      lines.push(`${indent}set_effect("${fieldValue(block, "EFFECT", "color")}", ${reporter("VALUE")})`);
      break;
    case "looks_changeeffectby":
      lines.push(`${indent}change_effect("${fieldValue(block, "EFFECT", "color")}", ${reporter("CHANGE")})`);
      break;
    case "looks_switchcostumeto":
      lines.push(`${indent}switch_costume(${reporter("COSTUME")})`);
      break;
    case "looks_nextcostume":
      lines.push(`${indent}next_costume()`);
      break;
    case "looks_switchbackdropto":
      lines.push(`${indent}switch_backdrop(${reporter("BACKDROP")})`);
      break;
    case "looks_nextbackdrop":
      lines.push(`${indent}next_backdrop()`);
      break;
    case "looks_changesizeby":
      lines.push(`${indent}change_size(${reporter("CHANGE")})`);
      break;
    case "looks_setsizeto":
      lines.push(`${indent}set_size(${reporter("SIZE")})`);
      break;
    case "sound_play":
      lines.push(`${indent}play_sound(${reporter("SOUND_MENU")})`);
      break;
    case "sound_playuntildone":
      lines.push(`${indent}play_sound_until_done(${reporter("SOUND_MENU")})`);
      break;
    case "control_wait":
      lines.push(`${indent}wait(${reporter("DURATION")})`);
      break;
    case "control_repeat":
      lines.push(`${indent}repeat(${reporter("TIMES")}) do`);
      lines.push(...translateSubstack(block, "SUBSTACK", blocks, indentLevel + 1, broadcasts));
      lines.push(`${indent}end`);
      break;
    case "control_forever":
      lines.push(`${indent}forever do`);
      lines.push(...translateSubstack(block, "SUBSTACK", blocks, indentLevel + 1, broadcasts));
      lines.push(`${indent}end`);
      break;
    case "control_if":
      lines.push(`${indent}if ${reporter("CONDITION")} then`);
      lines.push(...translateSubstack(block, "SUBSTACK", blocks, indentLevel + 1, broadcasts));
      lines.push(`${indent}end`);
      break;
    case "control_if_else":
      lines.push(`${indent}if ${reporter("CONDITION")} then`);
      lines.push(...translateSubstack(block, "SUBSTACK", blocks, indentLevel + 1, broadcasts));
      lines.push(`${indent}else`);
      lines.push(...translateSubstack(block, "SUBSTACK2", blocks, indentLevel + 1, broadcasts));
      lines.push(`${indent}end`);
      break;
    case "control_repeat_until":
      lines.push(`${indent}while not (${reporter("CONDITION")}) do`);
      lines.push(...translateSubstack(block, "SUBSTACK", blocks, indentLevel + 1, broadcasts));
      lines.push(`${indent}end`);
      break;
    case "control_wait_until":
      lines.push(`${indent}wait_until(${reporter("CONDITION")})`);
      break;
    case "control_stop":
      lines.push(`${indent}stop("${fieldValue(block, "STOP_OPTION", "all")}")`);
      break;
    case "control_create_clone_of":
      lines.push(`${indent}create_clone_of(${reporter("CLONE_OPTION")})`);
      break;
    case "control_delete_this_clone":
      lines.push(`${indent}delete_this_clone()`);
      break;
    case "event_broadcast":
    case "event_broadcastandwait":
      lines.push(`${indent}broadcast(${reporter("BROADCAST_INPUT")})`);
      break;
    case "sound_playuntildone":
      lines.push(`${indent}play_sound_until_done(${reporter("SOUND_MENU")})`);
      break;
    case "sound_stopallsounds":
      lines.push(`${indent}stop_all_sounds()`);
      break;
    case "data_setvariableto":
      lines.push(`${indent}set ${fieldValue(block, "VARIABLE", "var")} = ${reporter("VALUE")}`);
      break;
    case "data_changevariableby":
      lines.push(`${indent}change ${fieldValue(block, "VARIABLE", "var")} by ${reporter("VALUE")}`);
      break;
    case "data_showvariable":
      lines.push(`${indent}show_variable("${fieldValue(block, "VARIABLE", "")}")`);
      break;
    case "data_hidevariable":
      lines.push(`${indent}hide_variable("${fieldValue(block, "VARIABLE", "")}")`);
      break;
    case "looks_gotofrontback":
      lines.push(`${indent}go_to_layer("${fieldValue(block, "FRONT_BACK", "front")}")`);
      break;
    case "looks_goforwardbackwardlayers":
      lines.push(`${indent}change_layer("${fieldValue(block, "FORWARD_BACKWARD", "forward")}", ${reporter("NUM")})`);
      break;
    case "sound_setvolumeto":
      lines.push(`${indent}set_volume(${reporter("VOLUME")})`);
      break;
    case "sound_changevolumeby":
      lines.push(`${indent}change_volume(${reporter("VOLUME")})`);
      break;
    case "sensing_resettimer":
      lines.push(`${indent}reset_timer()`);
      break;
    default:
      lines.push(`${indent}${scratchFunctionCallFromBlock(block, blocks, broadcasts)}`);
      break;
  }

  return lines;
}

function translateSubstack(block, inputName, blocks, indentLevel, broadcasts) {
  const reference = block.inputs?.[inputName];
  const blockId = inputBlockId(reference);
  const lines = [];
  let currentId = blockId;
  while (currentId) {
    lines.push(...translateStackBlock(blocks[currentId], blocks, indentLevel, broadcasts));
    currentId = blocks[currentId]?.next || null;
  }
  return lines;
}

function translateScratchInput(input, blocks, broadcasts) {
  if (!input) {
    return "0";
  }

  const directBlockId = inputBlockId(input);
  if (directBlockId && blocks[directBlockId]) {
    return translateScratchReporter(blocks[directBlockId], blocks, broadcasts);
  }

  const literal = inputLiteral(input);
  if (literal !== null && literal !== undefined) {
    return moonLiteral(literal);
  }

  return "0";
}

function translateScratchReporter(block, blocks, broadcasts) {
  const reporter = (name) => translateScratchInput(block.inputs?.[name], blocks, broadcasts);

  switch (block.opcode) {
    case "operator_add":
      return `(${reporter("NUM1")} + ${reporter("NUM2")})`;
    case "operator_subtract":
      return `(${reporter("NUM1")} - ${reporter("NUM2")})`;
    case "operator_multiply":
      return `(${reporter("NUM1")} * ${reporter("NUM2")})`;
    case "operator_divide":
      return `(${reporter("NUM1")} / ${reporter("NUM2")})`;
    case "operator_equals":
      return `(${reporter("OPERAND1")} == ${reporter("OPERAND2")})`;
    case "operator_gt":
      return `(${reporter("OPERAND1")} > ${reporter("OPERAND2")})`;
    case "operator_lt":
      return `(${reporter("OPERAND1")} < ${reporter("OPERAND2")})`;
    case "operator_and":
      return `(${reporter("OPERAND1")} and ${reporter("OPERAND2")})`;
    case "operator_or":
      return `(${reporter("OPERAND1")} or ${reporter("OPERAND2")})`;
    case "operator_not":
      return `not (${reporter("OPERAND")})`;
    case "operator_join":
      return `(${reporter("STRING1")} .. ${reporter("STRING2")})`;
    case "operator_random":
      return `random(${reporter("FROM")}, ${reporter("TO")})`;
    case "operator_mathop":
      return `${fieldValue(block, "OPERATOR", "abs")}(${reporter("NUM")})`;
    case "data_variable":
      return fieldValue(block, "VARIABLE", "var");
    case "motion_pointtowards_menu":
      return moonLiteral(menuFieldValue(block, "TOWARDS"));
    case "sensing_touchingobjectmenu":
      return moonLiteral(normalizeMenuLiteral(menuFieldValue(block, "TOUCHINGOBJECTMENU")));
    case "sensing_keyoptions":
      return moonLiteral(menuFieldValue(block, "KEY_OPTION"));
    case "looks_costume":
      return moonLiteral(menuFieldValue(block, "COSTUME"));
    case "looks_backdrops":
      return moonLiteral(menuFieldValue(block, "BACKDROP"));
    case "sound_sounds_menu":
      return moonLiteral(menuFieldValue(block, "SOUND_MENU"));
    case "control_create_clone_of_menu":
      return moonLiteral(normalizeMenuLiteral(menuFieldValue(block, "CLONE_OPTION")));
    case "looks_costumenumbername":
      return fieldValue(block, "NUMBER_NAME", "name") === "number" ? "costume_number()" : "costume_name()";
    case "sensing_keypressed":
      return `key_pressed(${reporter("KEY_OPTION")})`;
    case "sensing_touchingobject":
      return touchingReporter(block, blocks, broadcasts);
    case "operator_letter_of":
      return `letter_of(${reporter("LETTER")}, ${reporter("STRING")})`;
    case "sensing_mousex":
      return "mouse_x()";
    case "sensing_mousey":
      return "mouse_y()";
    case "looks_backdropsnumbername":
      return "backdrop_name()";
    case "motion_xposition":
      return "sprite_x()";
    case "motion_yposition":
      return "sprite_y()";
    default:
      return scratchReporterCallFromBlock(block, blocks, broadcasts);
  }
}

function touchingReporter(block, blocks, broadcasts) {
  const input = block.inputs?.TOUCHINGOBJECTMENU;
  const literal = inputLiteral(input);
  if (literal === "_edge_" || literal === "edge") {
    return "touching_edge()";
  }
  if (literal === "_mouse_" || literal === "mouse-pointer") {
    return `scratch_touching_mouse()`;
  }
  if (literal) {
    return `touching_sprite(${moonLiteral(literal)})`;
  }
  return "touching_edge()";
}

function scratchFunctionCallFromBlock(block, blocks, broadcasts) {
  const args = collectScratchCallArguments(block, blocks, broadcasts);
  return `scratch_${sanitizeOpcode(block.opcode)}(${args.join(", ")})`;
}

function scratchReporterCallFromBlock(block, blocks, broadcasts) {
  const args = collectScratchCallArguments(block, blocks, broadcasts);
  return `scratch_${sanitizeOpcode(block.opcode)}(${args.join(", ")})`;
}

function collectScratchCallArguments(block, blocks, broadcasts) {
  const args = [];
  Object.entries(block.fields || {}).forEach(([key, value]) => {
    const resolved = Array.isArray(value) ? value[0] : value?.value ?? value;
    args.push(`${key.toLowerCase()}=${moonLiteral(normalizeMenuLiteral(resolved))}`);
  });
  Object.entries(block.inputs || {}).forEach(([key, value]) => {
    args.push(`${key.toLowerCase()}=${translateScratchInput(value, blocks, broadcasts)}`);
  });
  return args;
}

function sanitizeOpcode(opcode) {
  return String(opcode || "unknown").replaceAll(/[^a-z0-9]+/gi, "_");
}

function inputBlockId(input) {
  if (!Array.isArray(input)) {
    return null;
  }

  for (let index = 1; index < input.length; index += 1) {
    if (typeof input[index] === "string") {
      return input[index];
    }
  }

  return null;
}

function inputLiteral(input) {
  if (!Array.isArray(input)) {
    return null;
  }

  for (let index = input.length - 1; index >= 1; index -= 1) {
    if (Array.isArray(input[index])) {
      const literal = decodeScratchLiteral(input[index]);
      if (literal !== null && literal !== undefined) {
        return literal;
      }
    }
  }

  return null;
}

function menuFieldValue(block, fieldName) {
  const value = fieldValue(block, fieldName, "");
  return normalizeMenuLiteral(value);
}

function normalizeMenuLiteral(value) {
  if (value === "_mouse_") {
    return "mouse-pointer";
  }
  if (value === "_edge_") {
    return "edge";
  }
  if (value === "_random_") {
    return "random position";
  }
  return value;
}

function buildMenuInput(ctx, parentBlock, opcode, fieldName, value) {
  const menuId = nextScratchId(ctx);
  ctx.blocks[menuId] = {
    opcode,
    next: null,
    parent: null,
    inputs: {},
    fields: {
      [fieldName]: [value, null],
    },
    shadow: true,
    topLevel: false,
  };
  return [1, menuId];
}

function scratchMenuValue(kind, rawValue) {
  const value = stripQuotes(rawValue || "");
  if (kind === "pointTowards" && value === "mouse-pointer") {
    return "_mouse_";
  }
  if (kind === "touching" && value === "mouse-pointer") {
    return "_mouse_";
  }
  if (kind === "touching" && value === "edge") {
    return "_edge_";
  }
  return value;
}

function scratchCloneValue(rawValue) {
  const value = stripQuotes(rawValue || "");
  if (value === "myself") {
    return "_myself_";
  }
  return value;
}

function decodeScratchLiteral(entry) {
  if (!Array.isArray(entry)) {
    return entry ?? null;
  }
  if (entry.length >= 2 && !Array.isArray(entry[1])) {
    return entry[1];
  }
  if (entry.length >= 3 && !Array.isArray(entry[2])) {
    return entry[2];
  }
  return null;
}

function isHatBlock(opcode) {
  return opcode.startsWith("event_when") || opcode === "control_start_as_clone";
}

function collectBroadcasts(targets) {
  const broadcasts = {};
  targets.forEach((target) => {
    Object.entries(target.broadcasts || {}).forEach(([id, name]) => {
      broadcasts[id] = name;
    });
  });
  return broadcasts;
}

function collectBroadcastNames(targets) {
  const names = new Set();
  targets.forEach((target) => {
    target.events.forEach((eventDef) => {
      if (eventDef.type === "broadcast" && eventDef.value) {
        names.add(eventDef.value);
      }
      walkStatements(eventDef.body, (statement) => {
        if (statement.type === "command" && statement.name === "broadcast" && statement.args[0]) {
          names.add(stripQuotes(statement.args[0]));
        }
      });
    });
  });
  return [...names];
}

function walkStatements(statements, visitor) {
  statements.forEach((statement) => {
    visitor(statement);
    if (statement.body) {
      walkStatements(statement.body, visitor);
    }
  });
}

function synchronizeProjectFromCompilation(compiled) {
  compiled.targets.forEach((compiledTarget) => {
    let target = state.project.targets.find((entry) => entry.name === compiledTarget.name && entry.kind === compiledTarget.kind);
    if (!target) {
      target = createTargetFromCompilation(compiledTarget);
      state.project.targets.push(target);
    }

    const file = getVirtualFiles().find((entry) => entry.targetId === target.id && entry.kind === "target-source");
    if (!file) {
      target.source = serializeTargetSource(compiledTarget);
    }
  });
}

function createTargetFromCompilation(compiledTarget) {
  return {
    id: crypto.randomUUID(),
    kind: compiledTarget.kind,
    name: compiledTarget.name,
    source: serializeTargetSource(compiledTarget),
    x: 0,
    y: 0,
    direction: 90,
    size: 100,
    visible: true,
    rotationStyle: "all around",
    draggable: false,
    currentCostume: 0,
    volume: 100,
    layerOrder: state.project.targets.length,
    variables: {},
    lists: {},
    broadcasts: {},
    sounds: [],
    costumes: defaultCostumesForTarget(compiledTarget.kind, compiledTarget.name),
  };
}

function serializeTargetSource(compiledTarget) {
  const lines = [`${compiledTarget.kind} "${compiledTarget.name}" do`];
  compiledTarget.events.forEach((eventDef) => {
    lines.push(`  ${serializeEventHeader(eventDef)}`);
    lines.push(...serializeStatements(eventDef.body, 2));
    lines.push("  end");
  });
  lines.push("end");
  return lines.join("\n");
}

function serializeEventHeader(eventDef) {
  switch (eventDef.type) {
    case "flag_clicked":
      return "when flag_clicked do";
    case "clicked":
      return "when clicked do";
    case "cloned":
      return "when cloned do";
    case "key":
      return `when key("${eventDef.value}") do`;
    case "backdrop":
      return `when backdrop("${eventDef.value}") do`;
    case "broadcast":
      return `when broadcast("${eventDef.value}") do`;
    default:
      return "when flag_clicked do";
  }
}

function serializeStatements(statements, indentLevel) {
  const indent = "  ".repeat(indentLevel);
  const lines = [];

  statements.forEach((statement) => {
    if (statement.type === "command") {
      lines.push(`${indent}${statement.name}(${statement.args.join(", ")})`);
      return;
    }
    if (statement.type === "set") {
      lines.push(`${indent}set ${statement.name} = ${statement.expr}`);
      return;
    }
    if (statement.type === "change") {
      lines.push(`${indent}change ${statement.name} by ${statement.expr}`);
      return;
    }
    if (statement.type === "repeat") {
      lines.push(`${indent}repeat(${statement.count}) do`);
      lines.push(...serializeStatements(statement.body, indentLevel + 1));
      lines.push(`${indent}end`);
      return;
    }
    if (statement.type === "forever") {
      lines.push(`${indent}forever do`);
      lines.push(...serializeStatements(statement.body, indentLevel + 1));
      lines.push(`${indent}end`);
      return;
    }
    if (statement.type === "if") {
      lines.push(`${indent}if ${statement.condition} then`);
      lines.push(...serializeStatements(statement.body, indentLevel + 1));
      if (statement.elseBody?.length) {
        lines.push(`${indent}else`);
        lines.push(...serializeStatements(statement.elseBody, indentLevel + 1));
      }
      lines.push(`${indent}end`);
      return;
    }
    if (statement.type === "while") {
      lines.push(`${indent}while ${statement.condition} do`);
      lines.push(...serializeStatements(statement.body, indentLevel + 1));
      lines.push(`${indent}end`);
    }
  });

  return lines;
}

function importCostumeAsset(zip, costume, kind, targetName, index) {
  return readZipAssetAsDataUrl(zip, costume.md5ext).then((data) => ({
    name: costume.name || `${kind === "stage" ? "Backdrop" : targetName} ${index + 1}`,
    assetId: costume.assetId || randomAssetId(),
    dataFormat: costume.dataFormat || inferExtensionFromMd5ext(costume.md5ext) || "svg",
    md5ext: costume.md5ext || `${costume.assetId || randomAssetId()}.svg`,
    bitmapResolution: costume.bitmapResolution ?? 1,
    rotationCenterX: costume.rotationCenterX ?? (kind === "stage" ? 240 : 48),
    rotationCenterY: costume.rotationCenterY ?? (kind === "stage" ? 180 : 48),
    data: data || defaultCostumeData(kind, targetName, index),
  }));
}

function importSoundAsset(zip, sound) {
  return readZipAssetAsDataUrl(zip, sound.md5ext).then((data) => ({
    name: sound.name || "Sound",
    assetId: sound.assetId || randomAssetId(),
    dataFormat: sound.dataFormat || inferExtensionFromMd5ext(sound.md5ext) || "wav",
    md5ext: sound.md5ext || `${sound.assetId || randomAssetId()}.wav`,
    sampleRate: sound.rate ?? sound.sampleRate ?? 48000,
    sampleCount: sound.sampleCount ?? 1,
    data: data,
  }));
}

async function readZipAssetAsDataUrl(zip, fileName) {
  const asset = zip.file(fileName);
  if (!asset) {
    return null;
  }

  const blob = await asset.async("blob");
  return await blobToDataUrl(blob);
}

function addDataUrlOrTextAsset(zip, name, payload) {
  if (payload.startsWith("data:")) {
    const [header, body] = payload.split(",", 2);
    const base64 = header.includes(";base64");
    zip.file(name, body, { base64 });
    return;
  }
  zip.file(name, payload);
}

function mapTargetVariables(variables) {
  const result = {};
  Object.entries(variables).forEach(([id, [name, value]]) => {
    result[name] = { id, value };
  });
  return result;
}

function mapTargetLists(lists) {
  const result = {};
  Object.entries(lists).forEach(([id, [name, value]]) => {
    result[name] = { id, value };
  });
  return result;
}

function buildVariableIdIndex(globalVariables, localVariables, isStage) {
  const index = {};
  Object.keys(globalVariables).forEach((name) => {
    index[name] = `var:${safeFileStem(name)}:global`;
  });
  if (!isStage) {
    Object.entries(localVariables || {}).forEach(([name, entry]) => {
      index[name] = entry.id || `var:${safeFileStem(name)}:local`;
    });
  }
  return index;
}

function resolveVariableId(ctx, name) {
  if (!ctx.varIds[name]) {
    ctx.varIds[name] = `var:${safeFileStem(name)}:${Object.keys(ctx.varIds).length}`;
  }
  return ctx.varIds[name];
}

function buildBroadcastIdIndex(names) {
  return Object.fromEntries(names.map((name) => [name, `broadcast:${safeFileStem(name)}`]));
}

function serializeVariablesForTarget(globalVariables, localVariables, isStage, idIndex) {
  const result = {};
  if (isStage) {
    Object.entries(globalVariables).forEach(([name, value]) => {
      result[idIndex[name] || `var:${safeFileStem(name)}:global`] = [name, value];
    });
  } else {
    Object.entries(localVariables || {}).forEach(([name, entry]) => {
      result[entry.id || idIndex[name] || `var:${safeFileStem(name)}:local`] = [name, entry.value ?? 0];
    });
  }
  return result;
}

function serializeListsForTarget(lists) {
  const result = {};
  Object.entries(lists || {}).forEach(([name, entry]) => {
    result[entry.id || `list:${safeFileStem(name)}`] = [name, entry.value ?? []];
  });
  return result;
}

function targetMetaView(target) {
  return {
    kind: target.kind,
    name: target.name,
    x: target.x,
    y: target.y,
    direction: target.direction,
    size: target.size,
    visible: target.visible,
    rotationStyle: target.rotationStyle,
    costumes: target.costumes.map((costume) => costume.name),
    sounds: target.sounds.map((sound) => sound.name),
  };
}

function backdropMetaView(backdrop) {
  return {
    name: backdrop.name,
    assetId: backdrop.assetId,
    dataFormat: backdrop.dataFormat,
    md5ext: backdrop.md5ext,
    bitmapResolution: backdrop.bitmapResolution,
  };
}

function soundMetaView(sound) {
  return {
    name: sound.name,
    assetId: sound.assetId,
    dataFormat: sound.dataFormat,
    md5ext: sound.md5ext,
    sampleRate: sound.sampleRate,
    sampleCount: sound.sampleCount,
  };
}

function defaultTargetSource(kind, name) {
  return `${kind} "${name}" do\n  when flag_clicked do\n    log("${name} gotowy")\n  end\nend`;
}

function defaultCostumesForTarget(kind, name) {
  if (kind === "stage") {
    return [
      {
        name: "Dzien",
        assetId: randomAssetId(),
        dataFormat: "svg",
        md5ext: `${randomAssetId()}.svg`,
        bitmapResolution: 1,
        rotationCenterX: 240,
        rotationCenterY: 180,
        data: defaultBackdropSvg("Dzien", 0),
      },
    ];
  }

  return [
    {
      name: `${name} Base`,
      assetId: randomAssetId(),
      dataFormat: "svg",
      md5ext: `${randomAssetId()}.svg`,
      bitmapResolution: 1,
      rotationCenterX: 48,
      rotationCenterY: 48,
      data: defaultCostumeData("sprite", name, 0),
    },
  ];
}

function defaultCostumeData(kind, name, variant) {
  return kind === "stage" ? defaultBackdropSvg(name, variant) : defaultSpriteSvg(name, variant);
}

function defaultSpriteSvg(name, variant = 0) {
  const palettes = [
    ["#ffcf60", "#ff8c5a", "#13223d"],
    ["#6ce5c6", "#50a8ff", "#0e1630"],
    ["#ff8ab1", "#ffd66e", "#24102d"],
    ["#a8ff9f", "#42b86b", "#10221e"],
  ];
  const [primary, secondary, stroke] = palettes[variant % palettes.length];
  const initial = escapeHtml(name.slice(0, 1).toUpperCase() || "S");
  return `
<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g-${variant}" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="${secondary}" />
    </linearGradient>
  </defs>
  <circle cx="48" cy="48" r="36" fill="url(#g-${variant})" stroke="${stroke}" stroke-width="6" />
  <circle cx="36" cy="40" r="5" fill="${stroke}" />
  <circle cx="60" cy="40" r="5" fill="${stroke}" />
  <path d="M31 61 Q48 74 65 61" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round" />
  <text x="48" y="20" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" fill="${stroke}">${initial}</text>
</svg>`.trim();
}

function defaultBackdropSvg(name, variant = 0) {
  const palettes = [
    ["#a6f6ff", "#5d87ff"],
    ["#ffe29a", "#ff8e7b"],
    ["#8da2ff", "#6a3ef0"],
    ["#6ef0d2", "#1666c1"],
  ];
  const [a, b] = palettes[variant % palettes.length];
  const safe = escapeHtml(name);
  return `
<svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${variant}" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="${a}" />
      <stop offset="100%" stop-color="${b}" />
    </linearGradient>
  </defs>
  <rect width="480" height="360" fill="url(#bg-${variant})" rx="18" />
  <circle cx="96" cy="76" r="42" fill="rgba(255,255,255,0.33)" />
  <circle cx="386" cy="298" r="58" fill="rgba(255,255,255,0.15)" />
  <text x="240" y="188" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="36" fill="rgba(9,17,31,0.72)">${safe}</text>
</svg>`.trim();
}

function createDefaultProject() {
  return hydrateProject({
    meta: { format: "luascratch-sb", version: 2, language: "MoonLua" },
    name: "MoonQuest",
    looseFiles: [
      {
        id: "draft-globals",
        name: "globals.moon",
        content: `global score = 0\nglobal speed = 8`,
        compile: true,
      },
    ],
    targets: [
      {
        id: "stage-1",
        kind: "stage",
        name: "Stage",
        source: `stage "Stage" do\n  when broadcast("night") do\n    switch_backdrop("Noc")\n  end\n\n  when broadcast("day") do\n    switch_backdrop("Dzien")\n  end\nend`,
        costumes: [
          {
            name: "Dzien",
            assetId: randomAssetId(),
            dataFormat: "svg",
            md5ext: `${randomAssetId()}.svg`,
            bitmapResolution: 1,
            rotationCenterX: 240,
            rotationCenterY: 180,
            data: defaultBackdropSvg("Dzien", 0),
          },
          {
            name: "Noc",
            assetId: randomAssetId(),
            dataFormat: "svg",
            md5ext: `${randomAssetId()}.svg`,
            bitmapResolution: 1,
            rotationCenterX: 240,
            rotationCenterY: 180,
            data: defaultBackdropSvg("Noc", 2),
          },
        ],
        sounds: [],
        variables: {},
        lists: {},
        broadcasts: {},
        currentCostume: 0,
      },
      {
        id: "sprite-1",
        kind: "sprite",
        name: "Kot",
        source: `sprite "Kot" do\n  when flag_clicked do\n    goto(-120, 0)\n    show()\n    say("MoonLua start!", 1)\n    set score = 0\n  end\n\n  when key("arrowright") do\n    move(speed)\n  end\n\n  when key("space") do\n    change score by 1\n    say("Score: " .. score, 1)\n    broadcast("night")\n  end\nend`,
        x: -120,
        y: 0,
        direction: 90,
        size: 100,
        visible: true,
        rotationStyle: "all around",
        currentCostume: 0,
        variables: {},
        lists: {},
        broadcasts: {},
        sounds: [],
        costumes: defaultCostumesForTarget("sprite", "Kot"),
      },
      {
        id: "sprite-2",
        kind: "sprite",
        name: "Orbita",
        source: `sprite "Orbita" do\n  when flag_clicked do\n    goto(120, 40)\n    point_in_direction(180)\n  end\n\n  when clicked do\n    next_costume()\n    say("Klik!", 0.5)\n  end\nend`,
        x: 120,
        y: 40,
        direction: 180,
        size: 92,
        visible: true,
        rotationStyle: "all around",
        currentCostume: 0,
        variables: {},
        lists: {},
        broadcasts: {},
        sounds: [],
        costumes: [
          {
            name: "Orbita Base",
            assetId: randomAssetId(),
            dataFormat: "svg",
            md5ext: `${randomAssetId()}.svg`,
            bitmapResolution: 1,
            rotationCenterX: 48,
            rotationCenterY: 48,
            data: defaultSpriteSvg("Orbita", 1),
          },
          {
            name: "Orbita Glow",
            assetId: randomAssetId(),
            dataFormat: "svg",
            md5ext: `${randomAssetId()}.svg`,
            bitmapResolution: 1,
            rotationCenterX: 48,
            rotationCenterY: 48,
            data: defaultSpriteSvg("Orbita", 2),
          },
        ],
      },
    ],
  });
}

function countBackdrops() {
  const stage = state.project.targets.find((target) => target.kind === "stage");
  return stage?.costumes.length || 0;
}

function moonLiteral(value) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value ?? 0);
}

function normalizeLine(line) {
  return line.replace(/--.*$/, "").trim();
}

function evaluateStaticExpression(expr) {
  const translated = expr
    .replace(/\.\./g, "+")
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!")
    .replace(/\bnil\b/g, "null");
  return Function(`return (${translated});`)();
}

function parserError(index, message) {
  return new Error(`Linia ${index + 1}: ${message}`);
}

function splitArguments(value) {
  if (!value.trim()) {
    return [];
  }

  const args = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];
    if (char === '"' && previous !== "\\") {
      inString = !inString;
      current += char;
      continue;
    }

    if (!inString) {
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
      } else if (char === "," && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    args.push(current.trim());
  }
  return args;
}

function fieldValue(block, fieldName, fallback) {
  const field = block.fields?.[fieldName];
  if (!field) {
    return fallback;
  }
  if (Array.isArray(field)) {
    return field[0] ?? fallback;
  }
  if (typeof field === "object") {
    return field.value ?? fallback;
  }
  return field;
}

function normalizeExpression(expr) {
  return String(expr || "").trim();
}

function findTopLevelOperator(expr, operator) {
  let depth = 0;
  let inString = false;
  for (let index = 0; index <= expr.length - operator.length; index += 1) {
    const char = expr[index];
    const previous = expr[index - 1];
    if (char === '"' && previous !== "\\") {
      inString = !inString;
    }
    if (inString) {
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      continue;
    }
    if (depth === 0 && expr.slice(index, index + operator.length) === operator) {
      return index;
    }
  }
  return -1;
}

function isQuotedString(value) {
  return /^".*"$/.test(value);
}

function stripQuotes(value) {
  return String(value || "").replace(/^"(.*)"$/, "$1");
}

function inferDataFormat(data) {
  if (!data) {
    return null;
  }
  if (data.startsWith("data:image/svg+xml")) {
    return "svg";
  }
  if (data.startsWith("data:image/png")) {
    return "png";
  }
  if (data.startsWith("data:image/jpeg")) {
    return "jpg";
  }
  if (data.startsWith("data:audio/wav")) {
    return "wav";
  }
  if (data.startsWith("data:audio/mpeg")) {
    return "mp3";
  }
  return null;
}

function inferExtensionFromMd5ext(md5ext) {
  return String(md5ext || "").split(".").pop() || null;
}

function normalizeTargetKind(kind) {
  return kind === "stage";
}

function randomAssetId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function nextScratchId(ctx) {
  return `block_${ctx.nextId++}`;
}

function adoptInputChildren(parentId, block, ctx) {
  Object.values(block.inputs || {}).forEach((input) => {
    const childId = inputBlockId(input);
    if (childId && ctx.blocks[childId] && !ctx.blocks[childId].parent) {
      ctx.blocks[childId].parent = parentId;
    }
  });
}

function safeFileStem(value) {
  return String(value || "file")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "file";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function groupBy(list, getKey) {
  return list.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function setStatus(text) {
  elements.statusPill.textContent = text;
}

function logMessage(message) {
  const timestamp = new Date().toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  elements.consoleOutput.textContent += `[${timestamp}] ${message}\n`;
  elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
}
