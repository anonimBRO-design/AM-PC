// Alight Motion PC — Desktop Engine (electron/desktop-engine.js)
// Injected into renderer main world:
// 1. Anti-Jump & Anti-Focus Collapse (neutralize mobile selected layer focus session)
// 2. Anti-Accidental Multi-Select (left-clicking a layer with a mouse doesn't start 360ms long-press timer)
// 3. Multi-Select Media Relinker UI in #drawer.multiSelectDrawer
// 4. Escape key and cancel buttons to easily exit multi-selection mode

(function() {
  if (window.__amDesktopEngineInitialized) return;
  window.__amDesktopEngineInitialized = true;

  const getModel = () => window.omsTimelinePreRender?.model || window.model;
  const getTimeline = () => window.omsTimelinePreRender?.timeline || window.timeline;
  const getUI = () => window.omsAppBackRouter?.ui || window.ui;
  const getRenderer = () => window.omsTimelinePreRender?.renderer || window.renderer;

  // Track pointer type and modifier keys
  window._amLastPointerType = 'mouse';
  window._amCtrlHeld = false;
  window._amShiftHeld = false;

  window.addEventListener('pointerdown', (e) => {
    window._amLastPointerType = e.pointerType;
    window._amCtrlHeld = !!(e.ctrlKey || e.metaKey);
    window._amShiftHeld = !!e.shiftKey;
  }, true);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') window._amCtrlHeld = true;
    if (e.key === 'Shift') window._amShiftHeld = true;

    const activeTag = document.activeElement?.tagName;
    const isEditingText = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement?.isContentEditable;

    // Global Escape to exit shortcuts modal, paste style modal, or multi-select mode
    if (e.key === 'Escape') {
      const pasteModal = document.getElementById('amPasteStyleModal');
      if (pasteModal && !pasteModal.classList.contains('hidden')) {
        e.preventDefault();
        e.stopPropagation();
        window.closeSelectivePasteModal?.();
        return;
      }
      const shortcutsModal = document.getElementById('amShortcutsModal');
      if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
        e.preventDefault();
        e.stopPropagation();
        window.closeKeyboardShortcutsModal?.();
        return;
      }
      const ui = getUI();
      if (ui?.layerMultiSelectMode) {
        e.preventDefault();
        e.stopPropagation();
        ui.finishLayerMultiSelection({ announce: true });
        return;
      }
    }

    // Shortcut F1 atau ? untuk membuka panduan pintasan keyboard
    if ((e.key === 'F1' || (e.key === '?' && !e.ctrlKey && !e.metaKey)) && !isEditingText) {
      e.preventDefault();
      window.openKeyboardShortcutsModal?.();
      return;
    }

    // Shortcut F8 untuk beralih antara Mode Studio dan Mode Asli
    if (e.key === 'F8') {
      e.preventDefault();
      if (typeof window.toggleAmEditorLayout === 'function') {
        window.toggleAmEditorLayout();
      }
      return;
    }

    // Navigasi frame presisi panah kiri/kanan (1 frame biasa, 10 frame dengan Shift)
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isEditingText) {
      const model = getModel();
      const timeline = getTimeline();
      const renderer = getRenderer();
      if (model?.project && timeline) {
        e.preventDefault();
        const fps = timeline.projectFPS ? timeline.projectFPS() : (model.project.fps || 30);
        const step = (e.shiftKey ? 10 : 1) / fps;
        const duration = model.project.duration || 10;
        if (e.key === 'ArrowLeft') {
          model.time = Math.max(0, model.time - step);
        } else {
          model.time = Math.min(duration, model.time + step);
        }
        timeline.updatePlayhead?.();
        renderer?.render?.();
        return;
      }
    }

    // Home / End untuk lompat ke batas awal atau akhir timeline
    if ((e.key === 'Home' || e.key === 'End') && !isEditingText) {
      const timeline = getTimeline();
      if (timeline?.jumpBoundary) {
        e.preventDefault();
        timeline.jumpBoundary(e.key === 'End');
        return;
      }
    }
  }, true);

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') window._amCtrlHeld = false;
    if (e.key === 'Shift') window._amShiftHeld = false;
  }, true);

  // 1. Anti-Jump & Anti-Focus Collapse
  function disarmFocusSession() {
    if (typeof EditorSplitController !== 'undefined' && EditorSplitController.prototype) {
      if (!EditorSplitController.prototype._amPatched) {
        EditorSplitController.prototype._amPatched = true;
        EditorSplitController.prototype.canStartSelectedLayerFocusSession = () => false;
        EditorSplitController.prototype.selectedLayerFocusEligible = () => false;
        EditorSplitController.prototype.startSelectedLayerFocusSession = function() {
          this.selectedFocusSession = false;
          this.cameraFocusLayerId = null;
          this.clearSelectedLayerFocus({ restore: false });
          return false;
        };
      }
    }

    if (typeof EditorSplitLayoutPolicy !== 'undefined' && EditorSplitLayoutPolicy.prototype) {
      if (!EditorSplitLayoutPolicy.prototype._amPatched) {
        EditorSplitLayoutPolicy.prototype._amPatched = true;
        EditorSplitLayoutPolicy.prototype.automaticFocusEligible = () => false;
        EditorSplitLayoutPolicy.prototype.focusSessionEligible = () => false;
      }
    }

    const es = window.editorSplit || window.omsEditorSplit;
    if (es) {
      if (es.selectedFocusSession) {
        es.stopSelectedLayerFocusSession({ restore: false });
      }
      if (es.layoutPolicy) {
        es.layoutPolicy.automaticFocusEligible = () => false;
        es.layoutPolicy.focusSessionEligible = () => false;
      }
    }

    const area = document.querySelector('.timelineArea');
    if (area && area.classList.contains('omsSelectedLayerFocus')) {
      area.classList.remove('omsSelectedLayerFocus');
      document.querySelectorAll('#tracks .track').forEach(r => {
        r.classList.remove('omsSelectedFocus', 'omsFocusHidden');
        r.style.removeProperty('display');
        r.removeAttribute('aria-hidden');
      });
    }
  }

  // 2. Prevent mouse click long-press from triggering multi-select
  function disarmMouseLongPress() {
    if (typeof TimelineController !== 'undefined' && TimelineController.prototype) {
      if (!TimelineController.prototype._amPatchedMouse) {
        TimelineController.prototype._amPatchedMouse = true;
        const origLayerSelection = TimelineController.prototype.layerSelectionPointerDown;
        if (origLayerSelection) {
          TimelineController.prototype.layerSelectionPointerDown = function(e, l, handle) {
            // Di desktop, klik mouse biasa TIDAK boleh mengaktifkan timer long-press multi-select!
            // Multi-select dengan mouse hanya aktif jika user menekan Ctrl / Shift / Meta.
            if (e.pointerType === 'mouse' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              return;
            }
            return origLayerSelection.apply(this, arguments);
          };
        }
      }
    }

    if (typeof UIController !== 'undefined' && UIController.prototype) {
      if (!UIController.prototype._amPatchedLongPress) {
        UIController.prototype._amPatchedLongPress = true;
        const origLongPress = UIController.prototype.selectLayerByLongPress;
        if (origLongPress) {
          UIController.prototype.selectLayerByLongPress = function(layerId) {
            if (window._amLastPointerType === 'mouse' && !window._amCtrlHeld && !window._amShiftHeld) {
              return false;
            }
            return origLongPress.apply(this, arguments);
          };
        }
      }
    }
  }

  // 2b. Preserve Multi-Select Mode during Timeline Navigation & Pan
  function preserveMultiSelectDuringTimelineNavigation() {
    if (typeof TimelineController !== 'undefined' && TimelineController.prototype) {
      if (!TimelineController.prototype._amPatchedMultiSelectNav) {
        TimelineController.prototype._amPatchedMultiSelectNav = true;

        // Cegah clearTimelineLayerSelection merusak mode multi-select saat mengklik atau menyeret timeline kosong
        const origClearSelection = TimelineController.prototype.clearTimelineLayerSelection;
        TimelineController.prototype.clearTimelineLayerSelection = function() {
          const ui = getUI();
          if (ui?.layerMultiSelectMode) {
            // Mode multi-select aktif: jangan batalkan multi-selection atau menutup drawer
            const model = getModel();
            if (model?.selected) {
              model.selected = null;
              this.rebuild?.();
              const renderer = window.renderer || window.omsRenderer;
              renderer?.render?.();
            }
            return;
          }
          return origClearSelection.apply(this, arguments);
        };

        // Izinkan emptyPan berjalan pada area kosong trackLane saat mode multi-select aktif
        // sehingga user bisa menggeser (pan) timeline kiri-kanan dengan klik kiri mouse tanpa keluar dari mode
        const origIsEmptyTarget = TimelineController.prototype.isEmptyTimelineTarget;
        TimelineController.prototype.isEmptyTimelineTarget = function(target) {
          if (!target) return false;
          if (origIsEmptyTarget.call(this, target)) return true;

          const ui = getUI();
          if (ui?.layerMultiSelectMode && target.classList?.contains('trackLane')) {
            const row = target.closest?.('.track');
            const layerId = row?.dataset?.layerId;
            // Jika layer bukan bagian dari multi-reorder aktif, lane kosong aman dipakai untuk pan
            if (!layerId || !ui.layerMultiSelectedIds?.has?.(layerId)) {
              return true;
            }
          }
          return false;
        };
      }
    }
  }

  // 3. Multi-Select Media Relinker UI & Controls
  function isMediaLayer(layer) {
    return layer && ['image', 'video', 'audio'].includes(layer.type);
  }

  function isSourceMissing(layer) {
    if (!isMediaLayer(layer)) return false;
    try {
      if (typeof sourceUnavailable === 'function') return sourceUnavailable(layer);
    } catch(e) {}
    const src = layer.dataUrl || (window.mediaAssets?.sources?.get?.(layer.assetId));
    if (!src) return true;
    if (layer.type === 'image' && layer.img && (!layer.img.complete || !layer.img.naturalWidth)) return true;
    if (layer.type === 'video' && layer.video && (layer.video.error || layer.video.networkState === 3)) return true;
    if (layer.type === 'audio') {
      const a = layer.audio || layer.video;
      if (a && (a.error || a.networkState === 3)) return true;
    }
    return false;
  }

  function renderMultiRelinkTools() {
    const drawer = document.getElementById('drawer');
    if (!drawer || !drawer.classList.contains('multiSelectDrawer') || drawer.classList.contains('hidden')) return;

    const multiBody = drawer.querySelector('.drawerBody.multiSelectBody') || drawer.querySelector('.multiSelectBody');
    if (!multiBody) return;

    const ui = getUI();
    const model = getModel();
    if (!ui || !model) return;

    const selectedLayers = ui.multiSelectedLayers ? ui.multiSelectedLayers() : [];
    if (!selectedLayers.length) return;

    let existing = document.getElementById('amMultiRelinkWrap');
    if (existing) {
      if (existing.dataset.layerCount === String(selectedLayers.length)) return;
      existing.remove();
    }

    const mediaLayers = selectedLayers.filter(isMediaLayer);

    const wrap = document.createElement('div');
    wrap.id = 'amMultiRelinkWrap';
    wrap.className = 'amMultiRelinkWrap';
    wrap.dataset.layerCount = String(selectedLayers.length);

    let html = `
      <div class="amMultiActionRow">
        <button type="button" class="amMultiCancelBtn" id="amMultiCancelBtn" title="Batalkan pilihan banyak dan kembali ke layer normal">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          <span>Batalkan Pilihan (${selectedLayers.length} Layer)</span>
        </button>
      </div>
    `;

    if (mediaLayers.length > 0) {
      const missingLayers = mediaLayers.filter(isSourceMissing);
      const isAnyMissing = missingLayers.length > 0;

      html += `
        <div class="amMultiRelinkCard ${isAnyMissing ? 'has-missing' : ''}">
          <div class="amMultiRelinkHead">
            <div class="amMultiRelinkTitle">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1-1"/></svg>
              <b>Tautkan Ulang Media</b>
            </div>
            <span class="amMultiRelinkBadge ${isAnyMissing ? 'badge-warn' : 'badge-ok'}">
              ${isAnyMissing ? '⚠ ' + missingLayers.length + ' Perlu Ditautkan' : mediaLayers.length + ' Media Terdeteksi'}
            </span>
          </div>
          <p class="amMultiRelinkDesc">
            ${isAnyMissing
              ? 'Pilih media di bawah ini untuk mencari ulang file asli dari PC kamu:'
              : 'Semua file media terdeteksi. Kamu dapat mengganti semua layer sekaligus atau per-media:'}
          </p>
          <div class="amMultiRelinkBatchRow">
            <button type="button" class="amBatchReplaceBtn" id="amBatchReplaceBtn" title="Pilih satu file dari PC untuk mengganti semua ${mediaLayers.length} media terpilih sekaligus">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Ganti Semua Sekaligus (${mediaLayers.length} Media)</span>
            </button>
          </div>
          <div class="amMultiMediaList">
            ${mediaLayers.map(l => {
              const isMissing = missingLayers.includes(l);
              const escName = (l.name || 'Media').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
              return `
                <div class="amMultiMediaItem ${isMissing ? 'is-missing' : ''}">
                  <div class="amMultiMediaInfo">
                    <span class="amMediaTypeTag">${l.type.toUpperCase()}</span>
                    <b class="amMediaName" title="${escName}">${escName}</b>
                  </div>
                  <button type="button" class="amMediaRelinkBtn" data-layer-id="${l.id}">
                    <span>${isMissing ? 'Tautkan' : 'Ganti'}</span>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
          <div class="amMultiRelinkFooter">
            <button type="button" class="amRelinkAutoAllBtn" id="amRelinkAutoAllBtn">
              <span>↻ Cari Otomatis Semua Media</span>
            </button>
          </div>
        </div>
      `;
    }

    wrap.innerHTML = html;
    multiBody.appendChild(wrap);

    // Bind cancel button
    const cancelBtn = wrap.querySelector('#amMultiCancelBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        if (ui?.finishLayerMultiSelection) ui.finishLayerMultiSelection({ announce: true });
      };
    }

    // Helper: Apply one file to multiple media layers simultaneously
    async function applyFileToMediaLayers(file, targetLayers) {
      if (!file || !targetLayers || !targetLayers.length) return;
      const model = getModel();
      const ui = getUI();
      const renderer = window.omsTimelinePreRender?.renderer || window.renderer;

      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const isAud = file.type.startsWith('audio/');
      const fileKind = isImg ? 'image' : isVid ? 'video' : isAud ? 'audio' : null;

      const layersToUpdate = targetLayers.filter(l => !fileKind || l.type === fileKind);
      if (!layersToUpdate.length) {
        if (typeof toast === 'function') toast('Tipe file tidak cocok dengan layer yang dipilih.');
        return;
      }

      const assetId = 'asset_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
      const blobUrl = URL.createObjectURL(file);

      // Persist in IndexedDB 'assets' store
      try {
        const idbReq = indexedDB.open('open-motion-studio-v4', 1);
        idbReq.onsuccess = () => {
          const db = idbReq.result;
          if (db.objectStoreNames.contains('assets')) {
            const tx = db.transaction('assets', 'readwrite');
            tx.objectStore('assets').put({
              id: assetId,
              blob: file,
              name: file.name,
              type: file.type,
              updated: Date.now()
            });
          }
        };
      } catch (e) {
        console.warn('Gagal menyimpan asset ke IndexedDB:', e);
      }

      // Apply to all layers
      let successCount = 0;
      for (const l of layersToUpdate) {
        try {
          if (model?.disposeLayerRuntime) model.disposeLayerRuntime(l);
          l.assetId = assetId;
          l.dataUrl = blobUrl;
          if (l.type === 'image') {
            const img = new Image();
            img.src = blobUrl;
            l.img = img;
          } else if (l.type === 'video') {
            const v = document.createElement('video');
            v.src = blobUrl;
            v.muted = !!l.amSilentVideo;
            v.playsInline = true;
            v.preload = 'auto';
            l.video = v;
          }
          if (renderer?.textures) {
            renderer.textures.delete(l.id);
            const entry = renderer.textures.get(l.id);
            if (entry) entry.signature = null;
          }
          if (model?.hydrateLayer) model.hydrateLayer(l);
          if (window.media?.probe) {
            try { await window.media.probe(l); } catch(err) {}
          }
          successCount++;
        } catch (err) {
          console.error('Gagal memperbarui layer:', l.id, err);
        }
      }

      try {
        window.omsTimelinePreRender?.clear?.();
        if (ui?.rebuildAll) ui.rebuildAll();
        if (renderer?.render) renderer.render();
        if (window.bus?.emit) window.bus.emit('model:changed');
        if (window.autosave?.flush) await window.autosave.flush(true);
      } catch (e) {}

      if (typeof toast === 'function') {
        toast(`Berhasil mengganti ${successCount} media terpilih sekaligus!`);
      }

      renderMultiRelinkTools();
    }

    // Bind batch replace button (replaces ALL selected media layers at once)
    const batchBtn = wrap.querySelector('#amBatchReplaceBtn');
    if (batchBtn) {
      let batchInput = document.getElementById('amBatchMediaFileInput');
      if (!batchInput) {
        batchInput = document.createElement('input');
        batchInput.type = 'file';
        batchInput.id = 'amBatchMediaFileInput';
        batchInput.style.display = 'none';
        document.body.appendChild(batchInput);
      }

      batchBtn.onclick = () => {
        const allImages = mediaLayers.every(l => l.type === 'image');
        const allVideos = mediaLayers.every(l => l.type === 'video');
        const allAudio = mediaLayers.every(l => l.type === 'audio');
        batchInput.accept = allImages ? 'image/*' : allVideos ? 'video/*' : allAudio ? 'audio/*' : 'image/*,video/*,audio/*';
        batchInput.value = '';
        batchInput.onchange = async () => {
          const file = batchInput.files?.[0];
          if (!file) return;
          await applyFileToMediaLayers(file, mediaLayers);
        };
        batchInput.click();
      };
    }

    // Bind per-layer relink buttons
    wrap.querySelectorAll('.amMediaRelinkBtn').forEach(btn => {
      btn.onclick = () => {
        const lId = btn.dataset.layerId;
        const l = (model.layers || []).find(x => x.id === lId);
        if (l && typeof window.openMediaRelinkMenu === 'function') {
          window.openMediaRelinkMenu(l);
        } else if (l && typeof openRelinkMenu === 'function') {
          openRelinkMenu(l);
        }
      };
    });

    // Bind auto all button
    const autoAllBtn = wrap.querySelector('#amRelinkAutoAllBtn');
    if (autoAllBtn) {
      autoAllBtn.onclick = async () => {
        let successCount = 0;
        for (const l of mediaLayers) {
          try {
            if (typeof automaticRelink === 'function') {
              const ok = await automaticRelink(l);
              if (ok) successCount++;
            }
          } catch(e) {}
        }
        if (typeof toast === 'function') {
          toast('Pencarian otomatis selesai (' + successCount + '/' + mediaLayers.length + ' dipulihkan)');
        }
        renderMultiRelinkTools();
      };
    }
  }

  // Hook multi selection opening and drawer mutations
  function hookDrawerAndMulti() {
    const drawerEl = document.getElementById('drawer');
    if (drawerEl && !drawerEl._amMultiObserved) {
      drawerEl._amMultiObserved = true;
      const drawerObs = new MutationObserver(() => {
        if (drawerEl.classList.contains('multiSelectDrawer')) {
          renderMultiRelinkTools();
        }
      });
      drawerObs.observe(drawerEl, { attributes: true, attributeFilter: ['class'], childList: true });
    }

    const ui = getUI();
    if (ui && ui.openLayerMultiSelectionTools && !ui._amMultiHooked) {
      ui._amMultiHooked = true;
      const origOpen = ui.openLayerMultiSelectionTools.bind(ui);
      ui.openLayerMultiSelectionTools = function() {
        const res = origOpen.apply(this, arguments);
        setTimeout(renderMultiRelinkTools, 30);
        return res;
      };
    }
  }

  // 5. Backdrop Capture & Adjustment Layer Engine (Alight Motion magnifybg/copybg/lift/displacemap3)
  function isAdjustmentLayer(l) {
    if (!l) return false;
    const rawXmls = l.amImport?.effects || [];
    for (const xml of rawXmls) {
      if (typeof xml === 'string') {
        if (xml.includes('magnifybg') || xml.includes('copybg')) return true;
        if (xml.includes('displacemap3')) return true;
        if (xml.includes('lift') && xml.includes('name="fill"') && (xml.includes('value="0"') || xml.includes('value="0.000000"'))) return true;
      }
    }
    const amGPU = window.omsAMGPU;
    const fxs = amGPU?.effects ? amGPU.effects(l) : (l.effectStack || []);
    for (const fx of fxs) {
      const id = fx.id || fx.specId || fx.amEffect?.id || '';
      if (/\.(magnifybg|copybg|displacemap3)$/.test(id)) return true;
      if (/\.lift$/.test(id)) {
        const fillParam = fx.params?.find(p => p.id === 'fill');
        const val = fillParam?.channel?.value?.[0] ?? fillParam?.value;
        if (val === 0) return true;
      }
    }
    return false;
  }

  function patchAdjustmentLayers() {
    // 5A. Patch AMEffectGPU.compose (the AM shader compositing pipeline)
    const amGPU = window.omsAMGPU;
    if (amGPU && !amGPU._amBackdropPatched) {
      amGPU._amBackdropPatched = true;
      const origCompose = amGPU.compose.bind(amGPU);

      amGPU.compose = function(s, layers, depth = 0) {
        if (depth > 32) throw Error('Group terlalu dalam');
        const e = s.engine, comp = this.target(s, 'composition:' + depth).a;
        this.bind(s, comp, true);
        if (depth === 0) {
          const model = getModel();
          const color = s.r.hex(model?.project?.bg || '#000000'), a = model?.project?.amBackgroundAlpha ?? 1;
          s.gl.clearColor(color[0]*a, color[1]*a, color[2]*a, a);
          s.gl.clear(s.gl.COLOR_BUFFER_BIT);
        }

        const model = getModel();
        for (const l of layers) {
          if (l.hidden || (model && (model.time < l.start || model.time > l.start + l.duration)) || l.type === 'audio' || l.type === 'camera') continue;
          if (typeof omsLayerIncludedInExport === 'function' && !omsLayerIncludedInExport(l)) continue;

          let source;
          if (l.type === 'null' && l.amImport?.semanticVersion === 192) continue;
          if (l.type === 'null') {
            const nested = this.children.get(l.id) || [];
            if (nested.length) { source = this.compose(s, nested, depth + 1); this.blit(s, source, comp); }
            continue;
          }
          if (l.type === 'group') {
            source = this.compose(s, this.children.get(l.id) || [], depth + 1);
            const clip = this.target(s, 'clip:' + depth).a;
            this.source(s, l, clip, true);
            const groupTarget = this.target(s, 'composition:' + (depth + 1)).a;
            this.blit(s, clip.tex, groupTarget, 1, 'mask');
            source = groupTarget.tex;
          } else if (l.type === 'mesh') {
            const target = this.target(s, 'source:' + depth).a;
            this.bind(s, target, true);
            s.r.frameTrackMattes = [];
            s.r.drawMesh(l);
            source = target.tex;
          } else {
            if (isAdjustmentLayer(l)) {
              // Capture composition backdrop beneath this layer as source!
              const target = this.target(s, 'source:' + depth).a;
              this.blit(s, comp.tex, target, 1, 'replace');
              source = target.tex;
            } else {
              source = this.source(s, l, this.target(s, 'source:' + depth).a);
            }
          }

          source = window.OMSAMComplex ? window.OMSAMComplex.sourceAppearance(s, l, source, depth) : source;
          source = this.apply(s, l, source, comp, depth);

          // If adjustment layer is bounded shape (not full screen), mask to its shape
          if (isAdjustmentLayer(l) && l.type === 'shape') {
            const projW = model?.project?.width || 1080;
            const projH = model?.project?.height || 1080;
            const isFullScreen = Math.abs((+l.scaleX || 1)) >= 4 || Math.abs((+l.scale || 1)) >= 4 || (+l.w >= projW && +l.h >= projH);
            if (!isFullScreen) {
              const maskTarget = this.target(s, 'mask:' + depth).a;
              this.source(s, l, maskTarget, true);
              const maskedSource = this.target(s, 'source-masked:' + depth).a;
              this.blit(s, source, maskedSource, 1, 'replace');
              this.blit(s, maskTarget.tex, maskedSource, 1, 'mask');
              source = maskedSource.tex;
            }
          }

          const matte = l.trackMatte?.mode || 'none', blend = l.blend === 'source-over' ? 'normal' : l.blend;
          this.composite(s, source, comp, this.alpha(s, l), matte !== 'none' ? matte : blend);
          s.layers++;
        }
        return comp.tex;
      };
    }

    // 5B. Patch WebGLRenderer.prototype.paintTexture & ensureTexture (for fallback / 2D raster paths)
    if (typeof WebGLRenderer !== 'undefined' && WebGLRenderer.prototype && !WebGLRenderer.prototype._amBackdropPatched) {
      WebGLRenderer.prototype._amBackdropPatched = true;
      const origPaint = WebGLRenderer.prototype.paintTexture;
      const origEnsure = WebGLRenderer.prototype.ensureTexture;

      WebGLRenderer.prototype.ensureTexture = function(l) {
        if (isAdjustmentLayer(l)) {
          const entry = this.textures?.get(l.id);
          if (entry) entry.signature = null; // Always refresh backdrop each frame
        }
        return origEnsure.apply(this, arguments);
      };

      WebGLRenderer.prototype.paintTexture = function(l, e) {
        if (isAdjustmentLayer(l) && this.canvas && e?.canvas) {
          const c = e.ctx;
          const w = e.canvas.width;
          const h = e.canvas.height;
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.globalAlpha = 1;
          c.globalCompositeOperation = 'source-over';
          c.filter = 'none';
          c.clearRect(0, 0, w, h);
          try {
            c.drawImage(this.canvas, 0, 0, w, h);
          } catch(err) {}
          if (this.applyOrderedRasterEffects) {
            const model = getModel();
            this.applyOrderedRasterEffects(l, e, model?.time || 0);
          }
          const gl = this.gl;
          if (gl && e.texture) {
            gl.bindTexture(gl.TEXTURE_2D, e.texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            if (e.gpuWidth !== e.canvas.width || e.gpuHeight !== e.canvas.height) {
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e.canvas);
              e.gpuWidth = e.canvas.width;
              e.gpuHeight = e.canvas.height;
            } else {
              gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, e.canvas);
            }
          }
          return;
        }
        return origPaint.apply(this, arguments);
      };
    }
  }

  // 6. Alight Motion Authentic Effect Thumbnails (Desktop UI)
  function getEffectThumbnailPath(specId, effectName) {
    if (!specId && !effectName) return null;
    const extDefs = window.AMExtendedEffectDefinitions;

    // Direct lookup in extDefs if available
    let def = null;
    if (extDefs && specId) {
      def = extDefs[specId] ||
            extDefs['com.alightcreative.effects.' + specId.replace(/^am_/, '')] ||
            extDefs['com.alightcreative.blend.' + specId.replace(/^am_/, '')] ||
            extDefs['com.alightcreative.' + specId.replace(/^am_/, '')];
    }
    if (def?.thumb) return 'icons/effects/' + def.thumb;

    const cleanId = (specId || '').replace(/^am_/, '').replace(/^com\.alightcreative\.(effects\.)?/, '').toLowerCase();
    const baseCleanId = cleanId.replace(/\d+$/, '');

    const commonMap = {
      'transform_motion_blur': 'motion_blur.webp',
      'directional_motion_blur': 'directional_blur.webp',
      'zoom_motion_blur': 'zoom_blur.webp',
      'spin_motion_blur': 'spin_blur.webp',
      'motion_tile': 'tiles.webp',
      'bulge': 'pinch_bulge.webp',
      'blink': 'blink.webp',
      'blink2': 'blink.webp',
      'light_sweep': 'rays.webp',
      'flip': 'flip_layer.webp',
      'flip3': 'flip_layer.webp',
      '3d_flip': 'flip_layer.webp',
      'channelmap': 'channel_remap_rgb.webp',
      'channelmaphsv': 'channel_remap_hsv.webp',
      'checkerdissolve': 'checker.webp',
      'checkerdissolve2': 'checker.webp',
      'chromakey_adv': 'advanced_chroma_key.webp',
      'chromakey-adv': 'advanced_chroma_key.webp',
      'chromatic_aberration': 'rgb_split.webp',
      'color_balance_hls': 'color_balance.webp',
      'colorhot': 'hot_color.webp',
      'colorhot2': 'hot_color.webp',
      'colortint': 'colorize.webp',
      'colortemp': 'color_temperature.webp',
      'colortune': 'color_tune.webp',
      'bendwarp': 'bend.webp',
      'brightcont': 'brightness_contrast.webp',
      'brightcont2': 'brightness_contrast.webp',
      'brightness_contrast': 'brightness_contrast.webp',
      'hue_saturation': 'hue_shift.webp',
      'gaussian_blur': 'gaussian_blur.webp',
      'gaussianblur': 'gaussian_blur.webp',
      'wave_warp': 'wave_warp.webp',
      'wavewarp': 'wave_warp.webp',
      'wavewarp2': 'wave_warp.webp',
      'glow': 'glow.webp',
      'tile': 'tiles.webp',
      'tiles': 'tiles.webp',
      'drop_shadow': 'drop_shadow.webp',
      'vignette': 'vignette.webp',
      'crop': 'crop.webp',
      'border': 'border.webp',
      'levels': 'levels.webp',
      'curves': 'curves.webp',
      'find_edges': 'find_edges.webp',
      'gradient_ramp': 'gradient_map.webp',
      'four_color_gradient': 'four_color_gradient.webp',
      'fourcolorgradient': 'four_color_gradient.webp',
      'gradientoverlay2': 'gradient_overlay.webp',
      'gradient_overlay': 'gradient_overlay.webp',
      'glowscan': 'glow_scan.webp',
      'glow_scan': 'glow_scan.webp',
      'magnifybg': 'copy_background.webp',
      'copybg': 'copy_background.webp',
      'copy_background': 'copy_background.webp',
      'fade': 'fade_in_out.webp',
      'fade_in_out': 'fade_in_out.webp',
      'swing': 'swing.webp',
      'swing2': 'swing.webp',
      'oscillate': 'oscillate.webp',
      'oscillate3': 'oscillate.webp',
      'exposure': 'exposure_gamma.webp',
      'exposure_gamma': 'exposure_gamma.webp',
      'mblur': 'motion_blur.webp',
      'motionblur': 'motion_blur.webp',
      'motionblur2': 'motion_blur.webp',
      'motionblur3': 'motion_blur.webp',
      'motionblur4': 'motion_blur.webp',
      'dblur': 'directional_blur.webp',
      'directional_blur': 'directional_blur.webp',
      'lensblur': 'lens_blur.webp',
      'lensblur2': 'lens_blur.webp',
      'lens_blur': 'lens_blur.webp',
      'zoomblur': 'zoom_blur.webp',
      'zoomblur2': 'zoom_blur.webp',
      'zoomblur3': 'zoom_blur.webp',
      'zoom_blur': 'zoom_blur.webp',
      'spin': 'spin.webp',
      'spinblur': 'spin_blur.webp',
      'spinblur2': 'spin_blur.webp',
      'spin_blur': 'spin_blur.webp',
      'sharpen': 'sharpen.webp',
      'satvib': 'saturation_vibrance.webp',
      'saturation_vibrance': 'saturation_vibrance.webp',
      'hueshift': 'hue_shift.webp',
      'chromakey': 'chroma_key.webp',
      'displacemap3': 'displacement_map.webp',
      'displacement_map': 'displacement_map.webp',
      'circularripple': 'circular_ripple.webp',
      'circularripple2': 'circular_ripple.webp',
      'circular_ripple': 'circular_ripple.webp',
      'rgbsep': 'rgb_split.webp',
      'rgb_split': 'rgb_split.webp',
      'pinchbulge2': 'pinch_bulge.webp',
      'pinch_bulge': 'pinch_bulge.webp',
      'randomdisplace': 'turbulent_displace.webp',
      'turbulent_displace': 'turbulent_displace.webp',
      'swirl': 'swirl.webp',
      'swirl4': 'swirl.webp',
      'boxblur': 'box_blur.webp',
      'boxblur2': 'box_blur.webp',
      'boxblur3': 'box_blur.webp',
      'box_blur': 'box_blur.webp',
      'radialwipe': 'radial_wipe.webp',
      'radial_wipe': 'radial_wipe.webp'
    };

    if (commonMap[cleanId]) return 'icons/effects/' + commonMap[cleanId];
    if (commonMap[baseCleanId]) return 'icons/effects/' + commonMap[baseCleanId];

    if (effectName) {
      const nameClean = effectName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (commonMap[nameClean]) return 'icons/effects/' + commonMap[nameClean];
      const nameBase = nameClean.replace(/\d+$/, '');
      if (commonMap[nameBase]) return 'icons/effects/' + commonMap[nameBase];
    }
    return null;
  }

  function decorateEffectThumbnails() {
    // In Effect Browser: inject authentic thumbnail into .effectLibraryCard
    const drawer = document.getElementById('drawer');
    if (drawer && drawer.classList.contains('effectsBrowserDrawer')) {
      const cards = drawer.querySelectorAll('.effectLibraryCard[data-effect-library]:not([data-am-thumb-injected])');
      cards.forEach(card => {
        card.setAttribute('data-am-thumb-injected', 'true');
        const specId = card.dataset.effectLibrary;
        const effectName = card.dataset.effectName || card.querySelector('b')?.textContent?.trim();
        const thumbPath = getEffectThumbnailPath(specId, effectName);
        if (thumbPath) {
          const glyphSpan = card.querySelector('.effectGlyph');
          if (glyphSpan) {
            glyphSpan.classList.add('hasThumb');
            glyphSpan.innerHTML = `<img class="amEffectThumb" src="${thumbPath}" alt="" loading="lazy">`;
          }
        }
      });
    }

    // In Inspector Effect Stack: inject authentic thumbnail into .effectCardHead (scoped directly inside drawer)
    if (drawer && !drawer.classList.contains('hidden')) {
      const effectCards = drawer.querySelectorAll('.effectCard[data-effect-instance]:not([data-am-head-thumb])');
      effectCards.forEach(card => {
        card.setAttribute('data-am-head-thumb', 'true');
        const head = card.querySelector('.effectCardHead');
        const title = head?.querySelector('.effectCardTitle');
        if (head && title) {
          const instId = card.dataset.effectInstance;
          const model = getModel();
          const l = model?.selectedLayer?.();
          const inst = (l?.effectStack || []).find(i => i.instanceId === instId);
          const specId = inst?.specId || inst?.amEffect?.id;
          const effectName = title.textContent?.trim();
          const thumbPath = getEffectThumbnailPath(specId, effectName);
          if (thumbPath) {
            const img = document.createElement('img');
            img.className = 'amEffectHeadThumb';
            img.src = thumbPath;
            img.alt = '';
            head.insertBefore(img, title);
          }
        }
      });
    }
  }

  // 7. Desktop Timeline Mouse Wheel Navigation (Vertical Scroll, Shift+Horizontal, Ctrl+Zoom)
  function setupTimelineWheelNavigation() {
    const scroller = document.getElementById('timelineScroll');
    if (!scroller || scroller._amWheelBound) return;
    scroller._amWheelBound = true;

    scroller.addEventListener('wheel', (e) => {
      // Don't intercept wheel events coming directly from the ruler band (which has native zoom)
      if (e.target && e.target.closest && e.target.closest('#ruler')) return;

      // 1. If user holds Ctrl / Meta: delegate to Open Motion native timeline.onZoomWheel(e)
      if (e.ctrlKey || e.metaKey) {
        const timeline = getTimeline();
        if (timeline && typeof timeline.onZoomWheel === 'function') {
          timeline.onZoomWheel(e);
        }
        return;
      }

      // 2. If user holds Shift: pan timeline horizontally (kiri-kanan waktu) with smooth 1x speed
      if (e.shiftKey) {
        e.preventDefault();
        let delta = e.deltaY || e.deltaX;
        if (e.deltaMode === 1) delta *= 24;       // DOM_DELTA_LINE
        else if (e.deltaMode === 2) delta *= 240; // DOM_DELTA_PAGE
        scroller.scrollLeft += delta;
        return;
      }

      // 3. Normal mouse wheel without modifier:
      // Biarkan scroll vertikal native (atas-bawah) untuk melihat daftar track/layer tanpa di-hijack!
    }, { passive: false });
  }

  // 8. Dual Editor Layout Engine: Mode Studio (Atas-Bawah) vs Mode Asli (Berdampingan)
  function ensureStudioCss() {
    let style = document.getElementById('amStudioLayoutCss');
    if (!style) {
      style = document.createElement('style');
      style.id = 'amStudioLayoutCss';
      (document.head || document.documentElement).appendChild(style);
    }
    if (!style.textContent || style.textContent.length < 50) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'css/desktop-studio.css', false);
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 0) {
          style.textContent = xhr.responseText;
        }
      } catch (e) {
        console.warn('Gagal memuat desktop-studio.css via XHR:', e);
      }
    }
    return style;
  }

  function initStudioTimelineHeight() {
    const savedH = parseInt(localStorage.getItem('am_studio_timeline_height'), 10) || 280;
    document.documentElement.style.setProperty('--am-timeline-height', savedH + 'px');
  }

  function refitEditorCanvas() {
    requestAnimationFrame(() => {
      try {
        const main = document.querySelector('.editorMain');
        if (main) main.classList.remove('fitCompositionLayout');
        const ui = getUI();
        ui?.applyCompositionFitZoom?.();
        const renderer = window.renderer || window.omsRenderer;
        renderer?.resize?.();
        renderer?.render?.();
      } catch (e) {}
    });
  }

  function protectStudioGrid(editorMain) {
    if (!editorMain || editorMain._amGridProtected) return;
    editorMain._amGridProtected = true;

    const origSetProperty = editorMain.style.setProperty.bind(editorMain.style);
    const origRemoveProperty = editorMain.style.removeProperty.bind(editorMain.style);

    editorMain.style.setProperty = function(property, value, priority) {
      const isOriginal = document.documentElement.getAttribute('data-editor-layout') === 'original' ||
                         document.body?.classList?.contains('layout-original');
      if (!isOriginal && (property === 'grid-template-columns' || property === 'grid-template-rows')) {
        origRemoveProperty('grid-template-columns');
        origRemoveProperty('grid-template-rows');
        return;
      }
      return origSetProperty(property, value, priority);
    };

    const styleObserver = new MutationObserver(() => {
      const isOriginal = document.documentElement.getAttribute('data-editor-layout') === 'original' ||
                         document.body?.classList?.contains('layout-original');
      if (!isOriginal) {
        if (editorMain.style.getPropertyValue('grid-template-columns')) {
          origRemoveProperty('grid-template-columns');
        }
        if (editorMain.style.getPropertyValue('grid-template-rows')) {
          origRemoveProperty('grid-template-rows');
        }
      }
    });
    styleObserver.observe(editorMain, { attributes: true, attributeFilter: ['style'] });
  }

  function setupTimelineVerticalResizer() {
    // Bersihkan resizeBar agar tidak merusak urutan grid timelineArea
    const oldBar = document.getElementById('amTimelineResizeBar');
    if (oldBar) oldBar.remove();

    initStudioTimelineHeight();

    const splitHandle = document.getElementById('editorSplitHandle');
    if (!splitHandle || splitHandle._amVerticalResizerAttached) return;
    splitHandle._amVerticalResizerAttached = true;

    splitHandle.addEventListener('pointerdown', (ev) => {
      const isOriginal = document.documentElement.getAttribute('data-editor-layout') === 'original' ||
                         document.body?.classList?.contains('layout-original');
      if (isOriginal) return;

      ev.preventDefault();
      ev.stopPropagation();

      const startY = ev.clientY;
      const currentH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--am-timeline-height'), 10) || 280;
      let lastH = currentH;

      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      splitHandle.classList.add('dragging');

      const onPointerMove = (moveEv) => {
        const deltaY = moveEv.clientY - startY;
        const minH = 180;
        const maxH = Math.max(minH, window.innerHeight - 200);
        lastH = Math.min(maxH, Math.max(minH, Math.round(currentH - deltaY)));
        document.documentElement.style.setProperty('--am-timeline-height', lastH + 'px');
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove, true);
        window.removeEventListener('pointerup', onPointerUp, true);
        window.removeEventListener('pointercancel', onPointerUp, true);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        splitHandle.classList.remove('dragging');
        localStorage.setItem('am_studio_timeline_height', lastH);
        refitEditorCanvas();
        const timeline = getTimeline();
        timeline?.rebuild?.();
      };

      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('pointerup', onPointerUp, true);
      window.addEventListener('pointercancel', onPointerUp, true);
    }, { passive: false });
  }

  function watchDrawerForCanvasFit() {
    const drawer = document.getElementById('drawer');
    if (!drawer || drawer._amFitWatched) return;
    drawer._amFitWatched = true;
    let wasHidden = drawer.classList.contains('hidden');

    const obs = new MutationObserver(() => {
      const isHidden = drawer.classList.contains('hidden');
      if (isHidden !== wasHidden) {
        wasHidden = isHidden;
        const isOriginal = document.documentElement.getAttribute('data-editor-layout') === 'original' ||
                           document.body?.classList?.contains('layout-original');
        if (!isOriginal) {
          refitEditorCanvas();
        }
      }
    });
    obs.observe(drawer, { attributes: true, attributeFilter: ['class'] });
  }

  function setupLayoutSwitcher() {
    const style = ensureStudioCss();
    initStudioTimelineHeight();
    const savedLayout = localStorage.getItem('am_editor_layout_mode') || 'studio';
    const isOriginal = savedLayout === 'original';

    const editorMain = document.querySelector('.editorMain');
    if (editorMain) {
      protectStudioGrid(editorMain);
    }
    setupTimelineVerticalResizer();
    watchDrawerForCanvasFit();

    // Pastikan status stylesheet dan drawer sesuai mode saat inisialisasi
    if (style && !style._amInitApplied) {
      style._amInitApplied = true;
      style.disabled = isOriginal;
      style.media = isOriginal ? 'not all' : 'all';
      document.documentElement.setAttribute('data-editor-layout', savedLayout);
      if (document.body) {
        document.body.classList.toggle('layout-original', isOriginal);
        document.body.classList.toggle('layout-studio', !isOriginal);
      }
      const drawer = document.getElementById('drawer');
      const timelineArea = document.querySelector('.timelineArea');
      if (isOriginal) {
        if (drawer && timelineArea && drawer.parentElement !== timelineArea) {
          timelineArea.appendChild(drawer);
        }
      } else {
        if (drawer && editorMain && drawer.parentElement !== editorMain) {
          editorMain.appendChild(drawer);
        }
        if (editorMain) {
          editorMain.style.removeProperty('grid-template-columns');
          editorMain.style.removeProperty('grid-template-rows');
        }
      }
    }

    window.toggleAmEditorLayout = function(targetMode) {
      const current = localStorage.getItem('am_editor_layout_mode') || 'studio';
      const newMode = targetMode || (current === 'studio' ? 'original' : 'studio');
      localStorage.setItem('am_editor_layout_mode', newMode);

      const style = ensureStudioCss();
      const drawer = document.getElementById('drawer');
      const main = document.querySelector('.editorMain');
      const timelineArea = document.querySelector('.timelineArea');

      if (newMode === 'original') {
        if (style) {
          style.disabled = true;
          style.media = 'not all';
        }
        document.documentElement.setAttribute('data-editor-layout', 'original');
        document.body?.classList?.add('layout-original');
        document.body?.classList?.remove('layout-studio');
        if (drawer && timelineArea && drawer.parentElement !== timelineArea) {
          timelineArea.appendChild(drawer);
        }
        if (main) {
          main.style.removeProperty('grid-template-columns');
          main.style.removeProperty('grid-template-rows');
        }
        try { sessionStorage.removeItem('omsDesktopCanvasSplitRatioV441A'); } catch(e) {}
        try { sessionStorage.removeItem('omsDesktopLandscapePreviewRatio'); } catch(e) {}
        if (typeof toast === 'function') toast('Beralih ke Mode Asli (Berdampingan)');
      } else {
        if (style) {
          style.disabled = false;
          style.media = 'all';
        }
        document.documentElement.setAttribute('data-editor-layout', 'studio');
        document.body?.classList?.add('layout-studio');
        document.body?.classList?.remove('layout-original');
        if (drawer && main && drawer.parentElement !== main) {
          main.appendChild(drawer);
        }
        if (main) {
          main.style.removeProperty('grid-template-columns');
          main.style.removeProperty('grid-template-rows');
          protectStudioGrid(main);
        }
        if (typeof toast === 'function') toast('Beralih ke Mode Studio (Atas-Bawah)');
      }

      updateLayoutSwitcherBtn();
      refitEditorCanvas();
      const timeline = getTimeline();
      timeline?.rebuild?.();
    };

    function updateLayoutSwitcherBtn() {
      const btn = document.getElementById('amLayoutSwitchBtn');
      if (!btn) return;
      const current = localStorage.getItem('am_editor_layout_mode') || 'studio';
      if (btn.dataset.mode === current) return;
      btn.dataset.mode = current;

      const isOriginal = current === 'original';
      btn.classList.toggle('active', isOriginal);
      btn.title = isOriginal
        ? 'Tata Letak: Mode Asli (Berdampingan) [F8] • Klik untuk Mode Studio (Atas-Bawah)'
        : 'Tata Letak: Mode Studio (Atas-Bawah) [F8] • Klik untuk Mode Asli (Berdampingan)';

      btn.innerHTML = isOriginal
        ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;display:block;"><rect x="3" y="3" width="7" height="18" rx="2" fill="rgba(0,230,118,0.2)" stroke="#00e676"/><rect x="14" y="3" width="7" height="18" rx="2"/></svg>`
        : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;display:block;"><rect x="3" y="3" width="18" height="7" rx="2" fill="rgba(0,230,118,0.2)" stroke="#00e676"/><rect x="3" y="14" width="18" height="7" rx="2"/></svg>`;
    }

    const topActions = document.querySelector('.editorTop .topActions');
    if (topActions) {
      let btn = document.getElementById('amLayoutSwitchBtn');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'amLayoutSwitchBtn';
        btn.className = 'topIcon';
        btn.type = 'button';
        btn.onclick = () => window.toggleAmEditorLayout();
        topActions.insertBefore(btn, topActions.firstChild);
      }
      updateLayoutSwitcherBtn();
    }
  }

  // 8. Cheatsheet Shortcut Keyboard Modal
  function setupKeyboardShortcutsModal() {
    let modal = document.getElementById('amShortcutsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'amShortcutsModal';
      modal.className = 'hidden';
      modal.innerHTML = `
        <div class="amShortcutsBackdrop" id="amShortcutsBackdrop"></div>
        <div class="amShortcutsCard" role="dialog" aria-modal="true" aria-labelledby="amShortcutsTitle">
          <div class="amShortcutsHead">
            <div class="amShortcutsTitleGroup">
              <span class="amShortcutsBadge">PINTASAN KEYBOARD</span>
              <h2 id="amShortcutsTitle" class="amShortcutsTitle">Panduan Kontrol Cepat Desktop</h2>
              <p class="amShortcutsSubtitle">Pintasan keyboard &amp; kontrol mouse profesional Alight Motion PC</p>
            </div>
            <button id="amShortcutsClose" class="amShortcutsCloseBtn" type="button" aria-label="Tutup">×</button>
          </div>
          <div class="amShortcutsBody">
            <div class="amShortcutsGrid">
              <!-- Kolom 1 -->
              <div class="amShortcutGroup">
                <div class="amShortcutGroupTitle">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Pemutaran &amp; Garis Waktu
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Putar / Jeda (Play &amp; Pause)</span>
                  <div class="amShortcutKeys"><kbd>Spasi</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Maju / Mundur 1 Frame</span>
                  <div class="amShortcutKeys"><kbd>→</kbd> / <kbd>←</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Lompat 10 Frame (Cepat)</span>
                  <div class="amShortcutKeys"><kbd>Shift</kbd> + <kbd>→</kbd> / <kbd>←</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Lompat ke Awal / Akhir Timeline</span>
                  <div class="amShortcutKeys"><kbd>Home</kbd> / <kbd>End</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Keyframe Sebelumnya / Berikutnya</span>
                  <div class="amShortcutKeys"><kbd>[</kbd> / <kbd>]</kbd></div>
                </div>

                <div class="amShortcutGroupTitle" style="margin-top: 18px;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                  Tata Letak &amp; Tampilan
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Ganti Mode Studio / Mode Asli</span>
                  <div class="amShortcutKeys"><kbd>F8</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Buka Panduan Pintasan Ini</span>
                  <div class="amShortcutKeys"><kbd>F1</kbd> atau <kbd>?</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Tutup Dialog / Batal Pilihan</span>
                  <div class="amShortcutKeys"><kbd>Esc</kbd></div>
                </div>
              </div>

              <!-- Kolom 2 -->
              <div class="amShortcutGroup">
                <div class="amShortcutGroupTitle">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Kontrol Mouse &amp; Timeline
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Geser Timeline Horizontal (Pan)</span>
                  <div class="amShortcutKeys"><kbd>Shift</kbd> + <kbd>Scroll</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Perbesar / Perkecil Skala (Zoom)</span>
                  <div class="amShortcutKeys"><kbd>Ctrl</kbd> + <kbd>Scroll</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Gulir Daftar Track Atas / Bawah</span>
                  <div class="amShortcutKeys"><kbd>Scroll Roda</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Multi-Pilih Beberapa Layer Sekaligus</span>
                  <div class="amShortcutKeys"><kbd>Shift</kbd> + <kbd>Klik Layer</kbd></div>
                </div>

                <div class="amShortcutGroupTitle" style="margin-top: 18px;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Manajemen &amp; Pengeditan
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Simpan Proyek ke Disk Lokal</span>
                  <div class="amShortcutKeys"><kbd>Ctrl</kbd> + <kbd>S</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Batalkan Tindakan (Undo)</span>
                  <div class="amShortcutKeys"><kbd>Ctrl</kbd> + <kbd>Z</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Ulangi Tindakan (Redo)</span>
                  <div class="amShortcutKeys"><kbd>Ctrl</kbd> + <kbd>Y</kbd></div>
                </div>
                <div class="amShortcutRow">
                  <span class="amShortcutDesc">Hapus Layer Terpilih</span>
                  <div class="amShortcutKeys"><kbd>Del</kbd> / <kbd>Backspace</kbd></div>
                </div>
              </div>
            </div>
          </div>
          <div class="amShortcutsFoot">
            <div class="amShortcutsTip">
              <span class="amShortcutsTipBadge">TIPS PRO</span>
              <span>Gunakan <b>Rekam Pre-render</b> (titik lingkaran di kiri tombol Play) saat memutar timeline dengan efek WebGL berat agar preview berjalan 100% mulus tanpa lag.</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeBtn = modal.querySelector('#amShortcutsClose');
      const backdrop = modal.querySelector('#amShortcutsBackdrop');
      const card = modal.querySelector('.amShortcutsCard');
      closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.closeKeyboardShortcutsModal();
      });
      backdrop?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.closeKeyboardShortcutsModal();
      });
      card?.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    window.openKeyboardShortcutsModal = function() {
      const m = document.getElementById('amShortcutsModal');
      if (!m) return;
      m.classList.remove('hidden');
      m.classList.remove('am-morph-close');
      void m.offsetWidth;
      m.classList.add('am-morph-open');
    };

    window.closeKeyboardShortcutsModal = function() {
      const m = document.getElementById('amShortcutsModal');
      if (!m || m.classList.contains('hidden') || m.classList.contains('am-morph-close')) return;
      m.classList.remove('am-morph-open');
      m.classList.add('am-morph-close');
      setTimeout(() => {
        m.classList.add('hidden');
        m.classList.remove('am-morph-close');
      }, 200);
    };

    // Pasang tombol ? di bilah atas .editorTop .topActions
    const topActions = document.querySelector('.editorTop .topActions');
    if (topActions) {
      let helpBtn = document.getElementById('amShortcutsHelpBtn');
      if (!helpBtn) {
        helpBtn = document.createElement('button');
        helpBtn.id = 'amShortcutsHelpBtn';
        helpBtn.className = 'topIcon';
        helpBtn.type = 'button';
        helpBtn.title = 'Panduan Pintasan Keyboard [F1 / ?]';
        helpBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;display:block;"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        helpBtn.onclick = () => window.openKeyboardShortcutsModal();
        const layoutBtn = document.getElementById('amLayoutSwitchBtn');
        if (layoutBtn && layoutBtn.nextSibling) {
          topActions.insertBefore(helpBtn, layoutBtn.nextSibling);
        } else {
          topActions.appendChild(helpBtn);
        }
      }
    }
  }

  // 10. Native FFmpeg Export Integration in #exportSheet
  function setupNativeExportOption() {
    const exportFoot = document.querySelector('.exportFoot');
    if (!exportFoot) return;

    let nativeBtn = document.getElementById('amNativeFfmpegExportBtn');
    if (!nativeBtn) {
      nativeBtn = document.createElement('button');
      nativeBtn.id = 'amNativeFfmpegExportBtn';
      nativeBtn.className = 'amNativeExportFootBtn';
      nativeBtn.type = 'button';
      nativeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:inline-block;vertical-align:middle;flex-shrink:0;">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span>Ekspor Native MP4 (FFmpeg)</span>
      `;
      nativeBtn.onclick = () => window.amStartNativeFfmpegExport();
      exportFoot.appendChild(nativeBtn);
    }
  }

  window.amStartNativeFfmpegExport = async function() {
    if (!window.desktopAPI?.ffmpegStartSession) {
      alert('Fitur ekspor FFmpeg hanya tersedia di aplikasi desktop Alight Motion PC.');
      return;
    }

    const model = getModel();
    const timeline = getTimeline();
    const renderer = window.omsTimelinePreRender?.renderer || window.renderer;

    if (!model?.project) {
      alert('Tidak ada proyek aktif untuk diekspor.');
      return;
    }

    const btn = document.getElementById('amNativeFfmpegExportBtn');
    const origHtml = btn ? btn.innerHTML : '';

    try {
      const defaultName = (model.project.name || 'Proyek_Alight_Motion').replace(/[\\/:*?"<>|]/g, '_');
      const dialogRes = await window.desktopAPI.saveVideoDialog({
        defaultName: defaultName + '.mp4'
      });

      if (!dialogRes || dialogRes.canceled || !dialogRes.filePath) {
        return;
      }

      const outputPath = dialogRes.filePath;
      const fps = Math.max(1, parseInt(document.getElementById('exportFps')?.value || model.project.fps || 30, 10));
      const duration = model.project.duration || 10;
      const totalFrames = Math.max(1, Math.round(duration * fps));

      const stageCanvas = document.getElementById('stage');
      if (!stageCanvas) throw new Error('Stage canvas tidak ditemukan');

      const width = model.project.width || 1080;
      const height = model.project.height || 1080;

      const outCanvas = document.createElement('canvas');
      outCanvas.width = width;
      outCanvas.height = height;
      const outCtx = outCanvas.getContext('2d');

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>Menyiapkan sesi FFmpeg...</span>`;
      }

      const session = await window.desktopAPI.ffmpegStartSession({
        outputPath,
        fps,
        width,
        height,
        bitrate: '12M'
      });

      if (!session || !session.success) {
        throw new Error(session?.error || 'Gagal memulai FFmpeg');
      }

      const originalTime = model.time;

      for (let f = 0; f < totalFrames; f++) {
        const t = f / fps;
        model.time = t;
        if (timeline?.updatePlayhead) timeline.updatePlayhead();
        if (renderer?.render) renderer.render();

        outCtx.clearRect(0, 0, width, height);
        outCtx.drawImage(stageCanvas, 0, 0, width, height);

        const blob = await new Promise((res) => outCanvas.toBlob(res, 'image/png'));
        const buf = await blob.arrayBuffer();

        const feed = await window.desktopAPI.ffmpegFeedFrame(buf);
        if (!feed || !feed.success) {
          throw new Error('Gagal mengirim frame ' + f + ': ' + (feed?.error || 'unknown'));
        }

        if (btn && (f % 5 === 0 || f === totalFrames - 1)) {
          const pct = Math.round(((f + 1) / totalFrames) * 100);
          btn.innerHTML = `<span>Mengekspor: ${pct}% (Frame ${f + 1}/${totalFrames})</span>`;
        }
      }

      if (btn) {
        btn.innerHTML = `<span>Menyelesaikan berkas MP4...</span>`;
      }

      await window.desktopAPI.ffmpegEndSession();
      model.time = originalTime;
      if (timeline?.updatePlayhead) timeline.updatePlayhead();
      if (renderer?.render) renderer.render();

      if (typeof window.toast === 'function') {
        window.toast('Ekspor Native MP4 selesai!');
      } else {
        alert('Ekspor Native MP4 selesai: ' + outputPath);
      }
    } catch (err) {
      console.error('Native FFmpeg export error:', err);
      alert('Gagal mengekspor video: ' + (err?.message || err));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  };

  // 10. Selective Paste Style (Tempel Gaya Selektif 1:1 Alight Motion)
  function getPasteTargetLayers() {
    const ui = getUI();
    const model = getModel();
    if (!ui || !model) return [];
    if (ui.layerMultiSelectedIds && ui.layerMultiSelectedIds.size > 0) {
      const list = [...ui.layerMultiSelectedIds]
        .map(id => (model.layers || []).find(l => l.id === id))
        .filter(Boolean);
      if (list.length > 0) return list;
    }
    const single = typeof ui.singleSelectedLayer === 'function' ? ui.singleSelectedLayer() : (model.selectedLayer?.() || null);
    return single ? [single] : [];
  }

  function renewKeyIds(kf) {
    if (!kf) return {};
    const next = JSON.parse(JSON.stringify(kf));
    for (const arr of Object.values(next)) {
      if (Array.isArray(arr)) {
        for (const key of arr) {
          if (key && typeof key === 'object') {
            key.id = 'kf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
          }
        }
      }
    }
    return next;
  }

  async function applySelectiveStyle(targets, options) {
    const ui = getUI();
    const model = getModel();
    const renderer = getRenderer();
    const clipboard = ui?.layerActionClipboard;

    if (!clipboard || !clipboard.payload) {
      if (typeof window.toast === 'function') window.toast('Salin layer terlebih dahulu sebelum menempel gaya');
      return false;
    }

    const src = clipboard.payload.layer;
    const srcStyle = clipboard.payload.style || {};
    const mediaSource = clipboard.payload.mediaSource;
    if (!src) return false;

    if (typeof window.history?.push === 'function') {
      window.history.push();
    }

    let appliedCount = 0;
    for (const target of targets) {
      if (!target) continue;

      // 1. Warna & Isi (Color & Fill / Media Image-Video)
      if (options.colorAndFill) {
        const hasMedia = (src.type === 'image' || src.type === 'video') && (mediaSource || src.assetId || src.dataUrl);
        if (hasMedia) {
          const mediaUrl = mediaSource || src.dataUrl;
          const assetId = src.assetId || ('asset_' + Date.now().toString(36));

          if (model?.disposeLayerRuntime) {
            try { model.disposeLayerRuntime(target); } catch(e) {}
          }

          target.assetId = assetId;
          target.dataUrl = mediaUrl;
          target.type = src.type;

          if (src.type === 'image') {
            const img = new Image();
            img.src = mediaUrl;
            target.img = img;
          } else if (src.type === 'video') {
            const v = document.createElement('video');
            v.src = mediaUrl;
            v.muted = !!target.amSilentVideo;
            v.playsInline = true;
            v.preload = 'auto';
            target.video = v;
          }

          if (src.mediaWidth) target.mediaWidth = src.mediaWidth;
          if (src.mediaHeight) target.mediaHeight = src.mediaHeight;
          if (src.mediaDuration) target.mediaDuration = src.mediaDuration;

          if (renderer?.textures) {
            renderer.textures.delete(target.id);
            const entry = renderer.textures.get(target.id);
            if (entry) entry.signature = null;
          }
          if (model?.hydrateLayer) {
            try { model.hydrateLayer(target); } catch(e) {}
          }
          if (window.media?.probe) {
            try { await window.media.probe(target); } catch(e) {}
          }
        }

        if (src.color !== undefined) target.color = src.color;
        if (src.fillColor !== undefined) target.fillColor = src.fillColor;
        if (src.fillMode !== undefined) target.fillMode = src.fillMode;
        if (src.gradient !== undefined) target.gradient = JSON.parse(JSON.stringify(src.gradient));

        if (src.kf) {
          if (!target.kf) target.kf = {};
          if (src.kf.color) target.kf.color = renewKeyIds(src.kf.color);
          if (src.kf.fillColor) target.kf.fillColor = renewKeyIds(src.kf.fillColor);
        }
      }

      // 2. Efek (Effects)
      if (options.effects) {
        const effects = src.effects || srcStyle.effects || {};
        let effectStack = src.effectStack || srcStyle.effectStack;
        if (!effectStack && typeof window.omsLegacyEffectsToStack === 'function') {
          effectStack = window.omsLegacyEffectsToStack(src);
        }
        target.effects = JSON.parse(JSON.stringify(effects));
        target.effectStack = JSON.parse(JSON.stringify(effectStack || []));
        if (Array.isArray(target.effectStack)) {
          target.effectStack.forEach(fx => {
            if (fx) fx.id = 'fx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
          });
        }
        if (typeof window.omsEnsureEffectStack === 'function') {
          window.omsEnsureEffectStack(target);
        }
      }

      // 3. Campuran & Opasitas (Blending & Opacity)
      if (options.blend) {
        if (src.opacity !== undefined) target.opacity = src.opacity;
        if (src.blend !== undefined) target.blend = src.blend;
        if (src.blending !== undefined) target.blending = src.blending;
        if (src.blendMode !== undefined) target.blendMode = src.blendMode;
        if (src.compositionBlendMode !== undefined) target.compositionBlendMode = src.compositionBlendMode;

        if (src.kf?.opacity) {
          if (!target.kf) target.kf = {};
          target.kf.opacity = renewKeyIds(src.kf.opacity);
        }
      }

      // 4. Transformasi (Move & Transform)
      if (options.transform) {
        const tProps = ['x', 'y', 'z', 'scaleX', 'scaleY', 'scaleZ', 'rotation', 'rotX', 'rotY', 'rotZ', 'skewX', 'skewY', 'pivotX', 'pivotY', 'origin'];
        if (!target.kf) target.kf = {};
        for (const p of tProps) {
          if (src[p] !== undefined) {
            target[p] = (typeof src[p] === 'object' && src[p] !== null) ? JSON.parse(JSON.stringify(src[p])) : src[p];
          }
          if (src.kf?.[p]) {
            target.kf[p] = renewKeyIds(src.kf[p]);
          }
        }
      }

      // 5. Batas & Bayangan (Border & Shadow)
      if (options.border) {
        const bProps = ['stroke', 'strokeWidth', 'strokeColor', 'strokePosition', 'shadowColor', 'shadowBlur', 'shadowDistance', 'shadowAngle', 'shadow', 'border', 'borders'];
        for (const p of bProps) {
          if (src[p] !== undefined) {
            target[p] = (typeof src[p] === 'object' && src[p] !== null) ? JSON.parse(JSON.stringify(src[p])) : src[p];
          }
        }
      }

      // 6. Klip (Timing & Speed)
      if (options.clip) {
        if (src.inTime !== undefined) target.inTime = src.inTime;
        if (src.outTime !== undefined) target.outTime = src.outTime;
        if (src.speed !== undefined) target.speed = src.speed;
      }

      appliedCount++;
    }

    try {
      window.omsTimelinePreRender?.clear?.();
      const timeline = getTimeline();
      if (timeline?.rebuild) timeline.rebuild();
      if (renderer?.render) renderer.render();
      if (window.bus?.emit) window.bus.emit('model:changed');
      if (window.autosave?.flush) await window.autosave.flush(true);
    } catch (e) {
      console.error('Error refreshing after paste style:', e);
    }

    if (typeof window.toast === 'function') {
      window.toast(`Gaya ditempel ke ${appliedCount} layer!`);
    }

    return true;
  }

  function setupSelectivePasteStyle() {
    const ui = getUI();
    if (!ui) return;

    // Patch ui.layerActionsState so paste-style is enabled during multi-selection
    if (!ui._amPasteStyleStatePatched && ui.layerActionsState) {
      ui._amPasteStyleStatePatched = true;
      const origLayerActionsState = ui.layerActionsState.bind(ui);
      ui.layerActionsState = function() {
        const state = origLayerActionsState();
        const clipboard = this.layerActionClipboard?.hasLayer();
        const targets = getPasteTargetLayers();
        if (clipboard && targets.length > 0) {
          state.canPasteStyle = true;
        }
        return state;
      };
    }

    // Decorate "Tempel Gaya" row in #layerActionsPopup
    const popup = document.getElementById('layerActionsPopup');
    if (popup) {
      const pasteRow = popup.querySelector('[data-layer-action="paste-style"]');
      if (pasteRow) {
        const clipboard = ui.layerActionClipboard?.hasLayer();
        const targets = getPasteTargetLayers();
        if (clipboard && targets.length > 0) {
          pasteRow.disabled = false;
          pasteRow.setAttribute('aria-disabled', 'false');
        }

        if (!pasteRow.classList.contains('am-paste-row')) {
          pasteRow.classList.add('am-paste-row');
          const chevron = document.createElement('button');
          chevron.type = 'button';
          chevron.id = 'amPasteChevronBtn';
          chevron.className = 'am-paste-chevron-btn';
          chevron.title = 'Opsi Tempel Gaya (1:1 Alight Motion)';
          chevron.setAttribute('aria-label', 'Buka Opsi Tempel Gaya');
          chevron.innerHTML = '›';
          chevron.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.openSelectivePasteModal?.();
          };
          pasteRow.appendChild(chevron);

          // Fast-paste click listener for multi-selection
          pasteRow.addEventListener('click', (e) => {
            if (e.target.closest('#amPasteChevronBtn')) return;
            const curTargets = getPasteTargetLayers();
            if (curTargets.length > 1) {
              e.preventDefault();
              e.stopPropagation();
              applySelectiveStyle(curTargets, {
                colorAndFill: true,
                effects: true,
                blend: true,
                transform: true,
                border: true,
                clip: true
              });
              ui.closeLayerActions?.();
            }
          }, true);
        }
      }
    }

    // Create Modal #amPasteStyleModal if missing
    let modal = document.getElementById('amPasteStyleModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'amPasteStyleModal';
      modal.className = 'hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'amPasteStyleTitle');

      modal.innerHTML = `
        <div class="amPasteStyleBackdrop" id="amPasteStyleBackdrop"></div>
        <div class="amPasteStyleCard">
          <div class="amPasteStyleHead">
            <div class="amPasteStyleTitleGroup">
              <h3 id="amPasteStyleTitle" class="amPasteStyleTitle">
                <span>Tempel Gaya</span>
                <span class="amPasteStyleBadge">ALIGHT MOTION</span>
              </h3>
              <p id="amPasteStyleSubtitle" class="amPasteStyleSubtitle">Pilih atribut yang ingin ditempelkan</p>
            </div>
            <button id="amPasteStyleCloseBtn" class="amPasteStyleCloseBtn" type="button" aria-label="Tutup">✕</button>
          </div>
          <div class="amPasteStyleBody">
            <div class="amPasteStyleGrid">
              <!-- Tile 1: Warna & Isi -->
              <button type="button" class="amStyleTile is-active" data-style-key="colorAndFill">
                <div class="amTileCheck">✓</div>
                <div class="amTileIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11l-8-8-8.5 8.5a5 5 0 0 0 7 7L18 10"/><path d="M5 2l5 5"/><path d="M2 12h20"/><circle cx="12" cy="18" r="3"/></svg>
                </div>
                <div class="amTileLabel">Warna & Isi</div>
                <div class="amTileHint">Foto, video & warna</div>
              </button>

              <!-- Tile 2: Efek -->
              <button type="button" class="amStyleTile is-active" data-style-key="effects">
                <div class="amTileCheck">✓</div>
                <div class="amTileIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/></svg>
                </div>
                <div class="amTileLabel">Efek</div>
                <div class="amTileHint">Semua efek visual</div>
              </button>

              <!-- Tile 3: Campuran & Opasitas -->
              <button type="button" class="amStyleTile is-active" data-style-key="blend">
                <div class="amTileCheck">✓</div>
                <div class="amTileIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/></svg>
                </div>
                <div class="amTileLabel">Campuran & Opasitas</div>
                <div class="amTileHint">Blending & transparansi</div>
              </button>

              <!-- Tile 4: Transformasi -->
              <button type="button" class="amStyleTile is-active" data-style-key="transform">
                <div class="amTileCheck">✓</div>
                <div class="amTileIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                </div>
                <div class="amTileLabel">Transformasi</div>
                <div class="amTileHint">Posisi, skala, rotasi</div>
              </button>

              <!-- Tile 5: Batas & Bayangan -->
              <button type="button" class="amStyleTile is-active" data-style-key="border">
                <div class="amTileCheck">✓</div>
                <div class="amTileIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h12a2 2 0 0 0 2-2V7"/></svg>
                </div>
                <div class="amTileLabel">Batas & Bayangan</div>
                <div class="amTileHint">Stroke & bayangan</div>
              </button>

              <!-- Tile 6: Klip -->
              <button type="button" class="amStyleTile is-active" data-style-key="clip">
                <div class="amTileCheck">✓</div>
                <div class="amTileIcon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                </div>
                <div class="amTileLabel">Klip</div>
                <div class="amTileHint">In/out time & speed</div>
              </button>
            </div>

            <div class="amPasteStyleQuickbar">
              <button type="button" class="amQuickLink" id="amSelectAllStylesBtn">Pilih Semua</button>
              <span class="amQuickDivider">•</span>
              <button type="button" class="amQuickLink" id="amDeselectAllStylesBtn">Hapus Semua</button>
            </div>
          </div>
          <div class="amPasteStyleFooter">
            <button type="button" class="amBtnSecondary" id="amPasteStyleCancelBtn">Batal</button>
            <button type="button" class="amBtnPrimary" id="amPasteStyleApplyBtn">
              <span class="amBtnIcon">✓</span>
              <span id="amPasteStyleApplyText">TEMPEL GAYA</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Event Listeners for Tiles
      modal.querySelectorAll('.amStyleTile').forEach(tile => {
        tile.onclick = () => {
          tile.classList.toggle('is-active');
        };
      });

      // Quickbar Buttons
      const selectAllBtn = modal.querySelector('#amSelectAllStylesBtn');
      if (selectAllBtn) {
        selectAllBtn.onclick = () => {
          modal.querySelectorAll('.amStyleTile').forEach(t => t.classList.add('is-active'));
        };
      }
      const deselectAllBtn = modal.querySelector('#amDeselectAllStylesBtn');
      if (deselectAllBtn) {
        deselectAllBtn.onclick = () => {
          modal.querySelectorAll('.amStyleTile').forEach(t => t.classList.remove('is-active'));
        };
      }

      // Close & Cancel Buttons
      const closeBtn = modal.querySelector('#amPasteStyleCloseBtn');
      if (closeBtn) closeBtn.onclick = () => window.closeSelectivePasteModal?.();
      const cancelBtn = modal.querySelector('#amPasteStyleCancelBtn');
      if (cancelBtn) cancelBtn.onclick = () => window.closeSelectivePasteModal?.();
      const backdrop = modal.querySelector('#amPasteStyleBackdrop');
      if (backdrop) backdrop.onclick = () => window.closeSelectivePasteModal?.();

      // Apply Button
      const applyBtn = modal.querySelector('#amPasteStyleApplyBtn');
      if (applyBtn) {
        applyBtn.onclick = async () => {
          const targets = (window._amActivePasteTargets && window._amActivePasteTargets.length)
            ? window._amActivePasteTargets
            : getPasteTargetLayers();
          if (!targets.length) {
            if (typeof window.toast === 'function') window.toast('Tidak ada layer target yang dipilih');
            window.closeSelectivePasteModal?.();
            return;
          }

          const options = {
            colorAndFill: modal.querySelector('[data-style-key="colorAndFill"]')?.classList.contains('is-active') ?? false,
            effects: modal.querySelector('[data-style-key="effects"]')?.classList.contains('is-active') ?? false,
            blend: modal.querySelector('[data-style-key="blend"]')?.classList.contains('is-active') ?? false,
            transform: modal.querySelector('[data-style-key="transform"]')?.classList.contains('is-active') ?? false,
            border: modal.querySelector('[data-style-key="border"]')?.classList.contains('is-active') ?? false,
            clip: modal.querySelector('[data-style-key="clip"]')?.classList.contains('is-active') ?? false
          };

          const hasAny = Object.values(options).some(Boolean);
          if (!hasAny) {
            if (typeof window.toast === 'function') window.toast('Pilih minimal satu atribut gaya untuk ditempel');
            return;
          }

          applyBtn.disabled = true;
          try {
            await applySelectiveStyle(targets, options);
          } finally {
            applyBtn.disabled = false;
            window.closeSelectivePasteModal?.();
          }
        };
      }
    }

    window.openSelectivePasteModal = function() {
      const targets = getPasteTargetLayers();
      if (!targets.length) {
        if (typeof window.toast === 'function') window.toast('Pilih minimal satu layer target terlebih dahulu');
        return;
      }
      window._amActivePasteTargets = targets;

      const clipboard = ui.layerActionClipboard;
      if (!clipboard || !clipboard.hasLayer()) {
        if (typeof window.toast === 'function') window.toast('Salin layer terlebih dahulu sebelum menempel gaya');
        return;
      }

      ui.closeLayerActions?.();

      const modalEl = document.getElementById('amPasteStyleModal');
      if (!modalEl) return;

      const sub = modalEl.querySelector('#amPasteStyleSubtitle');
      if (sub) {
        sub.textContent = targets.length > 1 ? `${targets.length} layer target sedang dipilih` : `Target: ${targets[0].name || 'Layer'}`;
      }

      const applyTxt = modalEl.querySelector('#amPasteStyleApplyText');
      if (applyTxt) {
        applyTxt.textContent = targets.length > 1 ? `TEMPEL KE ${targets.length} LAYER` : 'TEMPEL GAYA';
      }

      // Default: ensure all active on open
      modalEl.querySelectorAll('.amStyleTile').forEach(t => t.classList.add('is-active'));

      modalEl.classList.remove('hidden');
    };

    window.closeSelectivePasteModal = function() {
      const modalEl = document.getElementById('amPasteStyleModal');
      if (modalEl) modalEl.classList.add('hidden');
    };
  }

  // Periodic heartbeat to keep patches active
  const runPatches = () => {
    disarmFocusSession();
    disarmMouseLongPress();
    preserveMultiSelectDuringTimelineNavigation();
    setupLayoutSwitcher();
    hookDrawerAndMulti();
    patchAdjustmentLayers();
    setupTimelineWheelNavigation();
    decorateEffectThumbnails();
    setupKeyboardShortcutsModal();
    setupNativeExportOption();
    setupSelectivePasteStyle();
  };

  runPatches();
  setInterval(runPatches, 400);
})();
