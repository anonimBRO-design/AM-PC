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
              : 'Semua file media terdeteksi. Kamu tetap dapat menautkan atau mengganti file secara manual:'}
          </p>
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

  // Periodic heartbeat to keep patches active
  const runPatches = () => {
    disarmFocusSession();
    disarmMouseLongPress();
    hookDrawerAndMulti();
  };

  runPatches();
  setInterval(runPatches, 400);
})();
