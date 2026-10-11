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

    // Global Escape to exit multi-select mode
    if (e.key === 'Escape') {
      const ui = getUI();
      if (ui?.layerMultiSelectMode) {
        e.preventDefault();
        e.stopPropagation();
        ui.finishLayerMultiSelection({ announce: true });
      }
    }

    // Shortcut F8 untuk beralih antara Mode Studio dan Mode Asli
    if (e.key === 'F8') {
      e.preventDefault();
      if (typeof window.toggleAmEditorLayout === 'function') {
        window.toggleAmEditorLayout();
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
  function setupLayoutSwitcher() {
    window.toggleAmEditorLayout = function(targetMode) {
      const current = localStorage.getItem('am_editor_layout_mode') || 'studio';
      const newMode = targetMode || (current === 'studio' ? 'original' : 'studio');
      localStorage.setItem('am_editor_layout_mode', newMode);

      const style = document.getElementById('amStudioLayoutCss');
      const drawer = document.getElementById('drawer');
      const editorMain = document.querySelector('.editorMain');
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
        if (editorMain) {
          editorMain.style.removeProperty('grid-template-columns');
          editorMain.style.removeProperty('grid-template-rows');
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
        if (drawer && editorMain && drawer.parentElement !== editorMain) {
          editorMain.appendChild(drawer);
        }
        if (editorMain) {
          editorMain.style.removeProperty('grid-template-columns');
          editorMain.style.removeProperty('grid-template-rows');
        }
        if (typeof toast === 'function') toast('Beralih ke Mode Studio (Atas-Bawah)');
      }

      updateLayoutSwitcherBtn();
      window.dispatchEvent(new Event('resize'));
      const ui = getUI();
      ui?.applyCompositionFitZoom?.();
      ui?.fit?.();
      const timeline = getTimeline();
      timeline?.rebuild?.();
      const renderer = window.renderer || window.omsRenderer;
      renderer?.resize?.();
      renderer?.render?.();
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
  };

  runPatches();
  setInterval(runPatches, 400);
})();
