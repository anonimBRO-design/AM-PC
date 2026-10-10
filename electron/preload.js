const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  platform: process.platform,

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedState: (callback) => {
    ipcRenderer.on('window-maximized-state', (event, state) => callback(state));
  },

  // Native Dialogs & File System
  openProjectDialog: () => ipcRenderer.invoke('dialog-open-project'),
  saveProjectDialog: (options) => ipcRenderer.invoke('dialog-save-project', options),
  openMediaDialog: () => ipcRenderer.invoke('dialog-open-media'),
  readFileBuffer: (filePath) => ipcRenderer.invoke('read-file-buffer', filePath),

  // FFmpeg Native Frame-by-Frame Pipeline
  ffmpegCheck: () => ipcRenderer.invoke('ffmpeg-check'),
  saveVideoDialog: (options) => ipcRenderer.invoke('dialog-save-video', options),
  ffmpegStartSession: (options) => ipcRenderer.invoke('ffmpeg-start-session', options),
  ffmpegFeedFrame: (buffer) => ipcRenderer.invoke('ffmpeg-feed-frame', buffer),
  ffmpegEndSession: () => ipcRenderer.invoke('ffmpeg-end-session'),
  onFfmpegClosed: (callback) => {
    ipcRenderer.on('ffmpeg-session-closed', (event, data) => callback(data));
  },
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell-show-item', filePath)
});

// Native Desktop styling, branding & in-app web modal hooks
window.addEventListener('DOMContentLoaded', () => {
  document.title = 'Alight Motion PC';

  if (document.body) {
    document.body.classList.add('is-electron');
  }

  // 1. Update branding: Official Alight Motion logo & text
  const updateBrand = () => {
    const markImg = document.querySelector('.homeMark img');
    if (markImg) {
      if (!markImg.src || !markImg.src.includes('test_prime_am.png')) {
        markImg.src = 'icons/test_prime_am.png';
      }
      markImg.alt = 'Alight Motion PC';
    }
    const wordmarkB = document.querySelector('.homeWordmark b');
    if (wordmarkB && wordmarkB.textContent.trim() !== 'Alight Motion PC') {
      wordmarkB.textContent = 'Alight Motion PC';
    }
  };
  updateBrand();

  // 1b. Rebrand & ensure Experimental Notice dialog is accessible
  const openNoticeModal = (triggerEl = null) => {
    const notice = document.getElementById('experimentalNotice');
    if (!notice) return;

    const trigger = triggerEl || document.getElementById('homeAMNoticeBtn');
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      notice._amOpenTrigger = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        target: trigger
      };
    } else {
      notice._amOpenTrigger = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }

    notice._amClosing = false;
    notice.removeAttribute('aria-hidden');
    notice.style.removeProperty('display');
    notice.style.removeProperty('pointer-events');

    const card = notice.querySelector('.experimentalNoticeCard');
    if (card && notice._amOpenTrigger) {
      const cardRect = card.getBoundingClientRect();
      const ox = notice._amOpenTrigger.x - cardRect.left;
      const oy = notice._amOpenTrigger.y - cardRect.top;
      card.style.transformOrigin = `${ox}px ${oy}px`;
    }

    notice.classList.remove('am-morph-close');
    void notice.offsetWidth;
    notice.classList.add('am-morph-open');
  };
  window.openNotice = openNoticeModal;

  const updateNotice = () => {
    const notice = document.getElementById('experimentalNotice');
    if (!notice) return;

    // Do NOT auto-hide with localStorage!
    try {
      localStorage.removeItem('am_notice_accepted');
    } catch (e) {}

    // Show notice on startup if not dismissed during THIS session
    if (!sessionStorage.getItem('am_notice_dismissed_session')) {
      openNoticeModal();
    }

    const title = document.getElementById('experimentalNoticeTitle');
    if (title && (title.textContent.includes('Open Motion') || !title.textContent.includes('Alight Motion PC'))) {
      title.textContent = 'Alight Motion PC masih dalam tahap eksperimen';
    }

    const intro = document.getElementById('experimentalNoticeIntro');
    if (intro && intro.textContent.includes('Open Motion')) {
      intro.textContent = intro.textContent.replaceAll('Open Motion', 'Alight Motion PC');
    }

    const eyebrow = notice.querySelector('.experimentalNoticeEyebrow');
    if (eyebrow && eyebrow.textContent !== 'ALIGHT MOTION PC') {
      eyebrow.textContent = 'ALIGHT MOTION PC';
    }

    const body = notice.querySelector('.experimentalNoticeBody');
    if (body && body.innerHTML.includes('Open Motion')) {
      body.innerHTML = body.innerHTML.replaceAll('Open Motion', 'Alight Motion PC');
    }

    const accept = document.getElementById('experimentalNoticeAccept');
    if (accept && !accept.dataset.amBound) {
      accept.dataset.amBound = 'true';
      accept.addEventListener('click', () => {
        sessionStorage.setItem('am_notice_dismissed_session', 'true');
        window.__omsExperimentalNoticeAccepted = true;
      });
    }

    if (!notice.dataset.amBound) {
      notice.dataset.amBound = 'true';
      notice.addEventListener('click', (e) => {
        if (e.target === notice) {
          sessionStorage.setItem('am_notice_dismissed_session', 'true');
          window.__omsExperimentalNoticeAccepted = true;
        }
      });
    }
  };
  updateNotice();

  // 2. Dock Inspector (#drawer) into .editorMain for widescreen layout
  const dockDrawer = () => {
    const drawer = document.getElementById('drawer');
    const editorMain = document.querySelector('.editorMain');
    if (drawer && editorMain && drawer.parentElement !== editorMain) {
      editorMain.appendChild(drawer);
    }
  };
  dockDrawer();

  // 3. Mount In-App Web Modal for AM Finder & AM Hub (Draggable, Maximizable, Split Screen)
  let amWebModal = document.getElementById('amWebModal');
  if (!amWebModal) {
    amWebModal = document.createElement('div');
    amWebModal.id = 'amWebModal';
    amWebModal.className = 'amWebModal hidden';
    amWebModal.innerHTML = `
      <div class="amWebModalBackdrop" id="amWebBackdrop"></div>
      <div class="amWebModalCard mode-finder" id="amWebModalCard">
        <div class="amWebModalHead" id="amWebModalHead">
          <div class="amWebModalHeadInfo">
            <span class="amWebModalBadge" id="amWebBadge">AMFINDER</span>
            <b class="amWebModalTitle" id="amWebTitle">AM Finder</b>
            <span class="amWebModalUrl" id="amWebUrl">https://amfinder.web.id</span>
          </div>

          <!-- Segmented Tab Switcher: AM Finder, AM Hub, Split Screen -->
          <div class="amWebTabs" id="amWebTabs">
            <button class="amWebTabBtn active" id="amWebTabFinder" type="button" title="Lihat AM Finder saja">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>AM Finder</span>
            </button>
            <button class="amWebTabBtn" id="amWebTabHub" type="button" title="Lihat AM Hub saja">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              <span>AM Hub</span>
            </button>
            <button class="amWebTabBtn amWebTabSplit" id="amWebTabSplit" type="button" title="Split Screen (AM Finder + AM Hub berdampingan)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
              <span>Split AM Hub</span>
            </button>
          </div>

          <!-- Window Actions: Reload, Maximize, Close -->
          <div class="amWebModalHeadActions">
            <button class="amWebHeadBtn" id="amWebReload" type="button" title="Muat Ulang Halaman (Reload)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
            <button class="amWebHeadBtn" id="amWebMaximize" type="button" title="Perbesar Jendela (Maximize)">
              <svg id="amWebMaxIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            </button>
            <button class="amWebHeadBtn amWebCloseBtn" id="amWebClose" type="button" title="Tutup [X]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div class="amWebModalBody" id="amWebModalBody">
          <!-- Left Pane: AM Finder -->
          <div class="amWebPane" id="amWebPaneFinder">
            <div class="amWebPaneBar">
              <div class="amWebPaneLabel">
                <span class="amWebPaneBadge amBadgeFinder">FINDER</span>
                <b>AM Finder</b>
                <span class="amWebPaneUrl">amfinder.web.id</span>
              </div>
              <button class="amWebPaneReloadBtn" id="amWebReloadFinderBtn" type="button" title="Reload AM Finder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
            <div class="amWebPaneFrameWrap">
              <iframe id="amWebFrameFinder" src="about:blank" allow="clipboard-read; clipboard-write" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
            </div>
          </div>

          <!-- Draggable Split Divider -->
          <div class="amWebSplitDivider" id="amWebSplitDivider" title="Geser untuk mengatur perbandingan split">
            <div class="amWebDividerHandle"></div>
          </div>

          <!-- Right Pane: AM Hub -->
          <div class="amWebPane" id="amWebPaneHub">
            <div class="amWebPaneBar">
              <div class="amWebPaneLabel">
                <span class="amWebPaneBadge amBadgeHub">AMHUB</span>
                <b>AM Hub</b>
                <span class="amWebPaneUrl">amhub.anonimbro.my.id</span>
              </div>
              <button class="amWebPaneReloadBtn" id="amWebReloadHubBtn" type="button" title="Reload AM Hub">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
            <div class="amWebPaneFrameWrap">
              <iframe id="amWebFrameHub" src="about:blank" allow="clipboard-read; clipboard-write" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(amWebModal);

    const card = document.getElementById('amWebModalCard');
    const headEl = document.getElementById('amWebModalHead');
    const modalBody = document.getElementById('amWebModalBody');
    const badgeEl = document.getElementById('amWebBadge');
    const titleEl = document.getElementById('amWebTitle');
    const urlEl = document.getElementById('amWebUrl');
    const maxBtn = document.getElementById('amWebMaximize');
    const maxIcon = document.getElementById('amWebMaxIcon');
    const frameFinder = document.getElementById('amWebFrameFinder');
    const frameHub = document.getElementById('amWebFrameHub');
    const paneFinder = document.getElementById('amWebPaneFinder');
    const paneHub = document.getElementById('amWebPaneHub');
    const splitDivider = document.getElementById('amWebSplitDivider');
    const tabFinder = document.getElementById('amWebTabFinder');
    const tabHub = document.getElementById('amWebTabHub');
    const tabSplit = document.getElementById('amWebTabSplit');

    let currentMode = 'finder'; // 'finder' | 'hub' | 'split'
    let hasCustomPos = false;

    const setMode = (mode) => {
      currentMode = mode;
      card.classList.remove('mode-finder', 'mode-hub', 'mode-split');
      tabFinder.classList.remove('active');
      tabHub.classList.remove('active');
      tabSplit.classList.remove('active');

      if (mode === 'finder') {
        card.classList.add('mode-finder');
        tabFinder.classList.add('active');
        badgeEl.textContent = 'AMFINDER';
        badgeEl.className = 'amWebModalBadge amBadgeFinder';
        titleEl.textContent = 'AM Finder — Presets & Resources';
        urlEl.textContent = 'https://amfinder.web.id';
        if (!frameFinder.src || frameFinder.src === 'about:blank') {
          frameFinder.src = 'https://amfinder.web.id';
        }
      } else if (mode === 'hub') {
        card.classList.add('mode-hub');
        tabHub.classList.add('active');
        badgeEl.textContent = 'AMHUB';
        badgeEl.className = 'amWebModalBadge amBadgeHub';
        titleEl.textContent = 'AM Hub — Community Hub';
        urlEl.textContent = 'https://amhub.anonimbro.my.id';
        if (!frameHub.src || frameHub.src === 'about:blank') {
          frameHub.src = 'https://amhub.anonimbro.my.id';
        }
      } else if (mode === 'split') {
        card.classList.add('mode-split');
        tabSplit.classList.add('active');
        badgeEl.textContent = 'SPLIT VIEW';
        badgeEl.className = 'amWebModalBadge amBadgeSplit';
        titleEl.textContent = 'AM Finder ⬌ AM Hub';
        urlEl.textContent = 'amfinder.web.id · amhub.anonimbro.my.id';
        if (!frameFinder.src || frameFinder.src === 'about:blank') {
          frameFinder.src = 'https://amfinder.web.id';
        }
        if (!frameHub.src || frameHub.src === 'about:blank') {
          frameHub.src = 'https://amhub.anonimbro.my.id';
        }
      }
    };

    tabFinder.onclick = () => setMode('finder');
    tabHub.onclick = () => setMode('hub');
    tabSplit.onclick = () => setMode('split');

    // Maximize / Restore Toggle
    const toggleMaximize = () => {
      const isMax = card.classList.toggle('is-maximized');
      if (isMax) {
        card._floatingLeft = card.style.left;
        card._floatingTop = card.style.top;
        card._floatingMargin = card.style.margin;
        card._floatingPos = card.style.position;
        card.style.left = '';
        card.style.top = '';
        card.style.margin = '';
        card.style.position = '';
        maxBtn.title = 'Pulihkan Ukuran (Restore)';
        maxIcon.innerHTML = `
          <rect x="8" y="4" width="12" height="12" rx="1.5"></rect>
          <path d="M4 8v11a1 1 0 0 0 1 1h11"></path>
        `;
      } else {
        maxBtn.title = 'Perbesar Jendela (Maximize)';
        maxIcon.innerHTML = `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>`;
        if (card._floatingLeft) card.style.left = card._floatingLeft;
        if (card._floatingTop) card.style.top = card._floatingTop;
        if (card._floatingMargin) card.style.margin = card._floatingMargin;
        if (card._floatingPos) card.style.position = card._floatingPos;
      }
    };

    maxBtn.onclick = toggleMaximize;
    headEl.ondblclick = (e) => {
      if (!e.target.closest('button') && !e.target.closest('.amWebTabs')) {
        toggleMaximize();
      }
    };

    // Draggable Window Logic
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let cardStartX = 0;
    let cardStartY = 0;

    headEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('.amWebTabs')) return;
      if (card.classList.contains('is-maximized')) return;

      isDragging = true;
      hasCustomPos = true;
      headEl.classList.add('is-dragging');
      document.body.classList.add('am-modal-dragging');

      const rect = card.getBoundingClientRect();
      cardStartX = rect.left;
      cardStartY = rect.top;
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      card.style.position = 'absolute';
      card.style.margin = '0';
      card.style.left = cardStartX + 'px';
      card.style.top = cardStartY + 'px';

      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      let nextX = cardStartX + dx;
      let nextY = cardStartY + dy;

      nextX = Math.max(0, Math.min(window.innerWidth - 140, nextX));
      nextY = Math.max(0, Math.min(window.innerHeight - 50, nextY));

      card.style.left = nextX + 'px';
      card.style.top = nextY + 'px';
    });

    const stopDragging = () => {
      if (!isDragging) return;
      isDragging = false;
      headEl.classList.remove('is-dragging');
      document.body.classList.remove('am-modal-dragging');
    };

    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('blur', stopDragging);

    // Draggable Split Divider
    let isResizingSplit = false;
    let splitStartX = 0;
    let leftStartWidth = 0;

    splitDivider.addEventListener('mousedown', (e) => {
      isResizingSplit = true;
      splitStartX = e.clientX;
      leftStartWidth = paneFinder.getBoundingClientRect().width;
      splitDivider.classList.add('is-resizing');
      document.body.classList.add('am-split-resizing');
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizingSplit) return;
      const totalWidth = modalBody.getBoundingClientRect().width - 8;
      const dx = e.clientX - splitStartX;
      const newLeft = Math.max(260, Math.min(totalWidth - 260, leftStartWidth + dx));
      const leftPct = (newLeft / totalWidth) * 100;
      paneFinder.style.flex = `0 0 ${leftPct}%`;
      paneHub.style.flex = '1 1 0%';
    });

    const stopSplitResize = () => {
      if (!isResizingSplit) return;
      isResizingSplit = false;
      splitDivider.classList.remove('is-resizing');
      document.body.classList.remove('am-split-resizing');
    };

    window.addEventListener('mouseup', stopSplitResize);
    window.addEventListener('blur', stopSplitResize);

    // Reload controls
    const reloadFrame = (frame) => {
      if (frame && frame.src && frame.src !== 'about:blank') {
        const cur = frame.src;
        frame.src = 'about:blank';
        setTimeout(() => { frame.src = cur; }, 60);
      }
    };

    document.getElementById('amWebReload').onclick = () => {
      if (currentMode === 'finder') reloadFrame(frameFinder);
      else if (currentMode === 'hub') reloadFrame(frameHub);
      else {
        reloadFrame(frameFinder);
        reloadFrame(frameHub);
      }
    };

    document.getElementById('amWebReloadFinderBtn').onclick = () => reloadFrame(frameFinder);
    document.getElementById('amWebReloadHubBtn').onclick = () => reloadFrame(frameHub);

    // Open & Close Modal
    window.openAmWebModal = (mode = 'finder') => {
      setMode(mode);
      amWebModal.classList.remove('hidden');
    };

    window.closeAmWebModal = () => {
      amWebModal.classList.add('hidden');
    };

    document.getElementById('amWebClose').onclick = window.closeAmWebModal;
    document.getElementById('amWebBackdrop').onclick = window.closeAmWebModal;
  }

  // 4. Mount AMFINDER and AMHUB buttons in home top bar beside AM LINK
  // 4. Mount AMFINDER, AMHUB, and INFO buttons in home top bar beside AM LINK
  const mountActionButtons = () => {
    const amLinkBtn = document.getElementById('homeAMLink');
    const topActions = document.querySelector('.homeTopActions');
    if (topActions && amLinkBtn) {
      if (!document.getElementById('homeAMFinder')) {
        const finderBtn = document.createElement('button');
        finderBtn.id = 'homeAMFinder';
        finderBtn.className = 'rightBtn';
        finderBtn.type = 'button';
        finderBtn.title = 'Buka AM Finder (amfinder.web.id)';
        finderBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <span>AMFINDER</span>
        `;
        finderBtn.onclick = () => window.openAmWebModal('finder');
        topActions.insertBefore(finderBtn, amLinkBtn);
      }

      if (!document.getElementById('homeAMHub')) {
        const hubBtn = document.createElement('button');
        hubBtn.id = 'homeAMHub';
        hubBtn.className = 'rightBtn';
        hubBtn.type = 'button';
        hubBtn.title = 'Buka AM Hub (amhub.anonimbro.my.id)';
        hubBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          <span>AMHUB</span>
        `;
        hubBtn.onclick = () => window.openAmWebModal('hub');
        topActions.insertBefore(hubBtn, amLinkBtn);
      }

      if (!document.getElementById('homeAMNoticeBtn')) {
        const noticeBtn = document.createElement('button');
        noticeBtn.id = 'homeAMNoticeBtn';
        noticeBtn.className = 'rightBtn';
        noticeBtn.type = 'button';
        noticeBtn.title = 'Info Alight Motion PC (Catatan Eksperimental)';
        noticeBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>INFO</span>
        `;
        noticeBtn.onclick = () => {
          openNoticeModal(noticeBtn);
        };
        topActions.appendChild(noticeBtn);
      }
    }
  };
  mountActionButtons();

  // 5. In-App Thumbnail Engine: Auto-capture project thumbnail from 1.0 second
  const injectThumbnailEngine = () => {
    if (document.getElementById('am-thumb-engine')) return;
    const script = document.createElement('script');
    script.id = 'am-thumb-engine';
    script.textContent = `
      (${function() {
        const getModel = () => window.omsTimelinePreRender?.model;
        const getRenderer = () => window.omsTimelinePreRender?.renderer;
        const getTimeline = () => window.omsTimelinePreRender?.timeline;
        const getUI = () => window.omsAppBackRouter?.ui;

        // Fetch project record directly from localStorage or IndexedDB 'open-motion-studio-v4'
        async function getStoredProjectData(id) {
          if (!id) return null;
          try {
            const lite = localStorage.getItem('oms4_lite_' + id);
            if (lite) {
              const data = JSON.parse(lite);
              if (data?.project) return data;
            }
          } catch (e) {}

          return new Promise((resolve) => {
            try {
              const req = indexedDB.open('open-motion-studio-v4', 1);
              req.onerror = () => resolve(null);
              req.onblocked = () => resolve(null);
              req.onsuccess = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('projects')) {
                  db.close();
                  return resolve(null);
                }
                try {
                  const tx = db.transaction('projects', 'readonly');
                  const store = tx.objectStore('projects');
                  const getReq = store.get(id);
                  getReq.onsuccess = () => {
                    const rec = getReq.result;
                    db.close();
                    resolve(rec?.data || null);
                  };
                  getReq.onerror = () => {
                    db.close();
                    resolve(null);
                  };
                } catch (err) {
                  db.close();
                  resolve(null);
                }
              };
            } catch (err) {
              resolve(null);
            }
          });
        }

        // Draw 2D canvas fallback thumbnail
        function draw2DFallbackThumbnail(data) {
          if (!data?.project) return null;
          const pw = Math.max(1, Number(data.project.width) || 1080);
          const ph = Math.max(1, Number(data.project.height) || 1920);
          const bg = data.project.background || '#131622';

          const aspect = pw / ph;
          let tw = 240;
          let th = Math.round(240 / aspect);
          if (th > 240) { th = 240; tw = Math.round(240 * aspect); }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(48, tw);
          canvas.height = Math.max(48, th);
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const sx = canvas.width / pw;
          const sy = canvas.height / ph;
          const layers = Array.isArray(data.layers) ? data.layers : [];

          for (const layer of layers) {
            if (!layer || layer.hidden) continue;
            try {
              ctx.save();
              const lx = (Number(layer.x) || (pw / 2)) * sx;
              const ly = (Number(layer.y) || (ph / 2)) * sy;
              const lw = (Number(layer.width) || (pw * 0.5)) * sx;
              const lh = (Number(layer.height) || (ph * 0.3)) * sy;
              const rot = (Number(layer.rotation) || 0) * Math.PI / 180;
              const opacity = Number.isFinite(layer.opacity) ? layer.opacity : 1;

              ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
              ctx.translate(lx, ly);
              if (rot) ctx.rotate(rot);

              if (layer.type === 'text' && layer.text) {
                const fontSize = Math.max(7, (Number(layer.fontSize) || 48) * sy);
                ctx.font = 'bold ' + fontSize + 'px sans-serif';
                ctx.fillStyle = layer.color || '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(layer.text).slice(0, 30), 0, 0);
              } else if (layer.type === 'shape' || layer.type === 'rect') {
                ctx.fillStyle = layer.fill || layer.color || '#5edbb5';
                ctx.fillRect(-lw / 2, -lh / 2, lw, lh);
              } else if (layer.type === 'circle') {
                ctx.fillStyle = layer.fill || layer.color || '#5edbb5';
                ctx.beginPath();
                ctx.arc(0, 0, Math.min(lw, lh) / 2, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            } catch (e) {}
          }

          return canvas.toDataURL('image/webp', 0.88);
        }

        // Render project at 1.0s using engine WebGL
        async function renderProjectThumbnailAt1s(data) {
          const model = getModel();
          const renderer = getRenderer();
          if (!model || !renderer || !data?.project) return null;

          const editor = document.getElementById('editor');
          if (editor && !editor.classList.contains('hidden')) return null;

          const hadProject = !!model.project;
          const snapshot = hadProject ? model.serialize({ includeMedia: false }) : null;
          const savedTime = model.time;

          try {
            const dur = Number(data.project.duration) || 5;
            const targetTime = Math.min(1.0, Math.max(0, dur > 1.0 ? 1.0 : dur - 0.05));

            model.restore(data, { timeOverride: targetTime });
            renderer.resize();
            renderer.render();

            const canvas = renderer.canvas;
            if (canvas && canvas.width > 0 && canvas.height > 0) {
              const thumbCanvas = document.createElement('canvas');
              const aspect = canvas.width / canvas.height;
              let tw = 240;
              let th = Math.round(240 / aspect);
              if (th > 240) { th = 240; tw = Math.round(240 * aspect); }
              thumbCanvas.width = Math.max(48, tw);
              thumbCanvas.height = Math.max(48, th);

              const ctx = thumbCanvas.getContext('2d');
              if (data.project.background) {
                ctx.fillStyle = data.project.background;
                ctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
              }
              ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
              return thumbCanvas.toDataURL('image/webp', 0.88);
            }
          } catch (err) {
            console.warn('WebGL render error:', err);
          } finally {
            try {
              if (snapshot) model.restore(snapshot, { timeOverride: savedTime });
              else if (!hadProject) model.reset();
              renderer.resize();
            } catch (e) {}
          }
          return null;
        }

        // Capture live while inside editor at 1.0s
        window.captureProjectThumbnail = function(targetTime = 1.0) {
          const model = getModel();
          const renderer = getRenderer();
          if (!model?.project?.id || !renderer?.canvas) return null;

          const originalTime = model.time;
          const proj = model.project;
          const dur = Number(proj.duration) || 5;
          const timeToSample = Math.min(targetTime, Math.max(0, dur > targetTime ? targetTime : dur - 0.05));

          try {
            model.time = timeToSample;
            renderer.render();

            const canvas = renderer.canvas;
            if (!canvas || !canvas.width || !canvas.height) return null;

            const thumbCanvas = document.createElement('canvas');
            const aspect = canvas.width / canvas.height;
            let tw = 240;
            let th = Math.round(240 / aspect);
            if (th > 240) { th = 240; tw = Math.round(240 * aspect); }
            thumbCanvas.width = Math.max(48, tw);
            thumbCanvas.height = Math.max(48, th);

            const ctx = thumbCanvas.getContext('2d');
            if (proj.background) {
              ctx.fillStyle = proj.background;
              ctx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
            }
            ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
            const dataUrl = thumbCanvas.toDataURL('image/webp', 0.88);

            const key = 'am_thumb_' + proj.id;
            try { localStorage.setItem(key, dataUrl); } catch (e) {}
            applyThumbToCard(proj.id, dataUrl);
            return dataUrl;
          } catch (err) {
            console.warn('captureProjectThumbnail error:', err);
            return null;
          } finally {
            model.time = originalTime;
            renderer.render();
          }
        };

        // DOM Helper: Apply thumbnail to card
        function applyThumbToCard(projectId, dataUrl) {
          if (!projectId || !dataUrl) return;
          const card = document.querySelector('.projectCard[data-project-id="' + projectId + '"]');
          if (!card) return;
          const thumb = card.querySelector('.projectThumb');
          if (!thumb) return;

          let img = thumb.querySelector('.projectThumbImg');
          if (!img) {
            img = document.createElement('img');
            img.className = 'projectThumbImg';
            img.alt = 'Thumbnail 1s';
            thumb.appendChild(img);
          }
          if (img.src !== dataUrl) {
            img.src = dataUrl;
          }
          thumb.classList.add('has-thumb');
        }
        window.applyThumbToCard = applyThumbToCard;

        // Sync existing cached thumbnails to cards
        function syncExistingThumbnails() {
          const cards = document.querySelectorAll('.projectCard');
          cards.forEach(card => {
            const pid = card.dataset.projectId;
            if (!pid) return;
            const cached = localStorage.getItem('am_thumb_' + pid);
            if (cached) {
              applyThumbToCard(pid, cached);
            }
          });
        }
        window.syncExistingThumbnails = syncExistingThumbnails;

        // Queue to generate missing thumbnails in background
        let isGeneratingQueue = false;
        async function processMissingThumbnails() {
          if (isGeneratingQueue) return;
          const editor = document.getElementById('editor');
          if (editor && !editor.classList.contains('hidden')) return;

          const cards = document.querySelectorAll('.projectCard');
          const missingIds = [];
          cards.forEach(card => {
            const pid = card.dataset.projectId;
            if (pid && !localStorage.getItem('am_thumb_' + pid)) {
              missingIds.push(pid);
            }
          });

          if (!missingIds.length) return;
          isGeneratingQueue = true;

          for (const pid of missingIds) {
            if (editor && !editor.classList.contains('hidden')) break;

            try {
              const data = await getStoredProjectData(pid);
              if (data?.project) {
                let dataUrl = await renderProjectThumbnailAt1s(data);
                if (!dataUrl) {
                  dataUrl = draw2DFallbackThumbnail(data);
                }
                if (dataUrl) {
                  try { localStorage.setItem('am_thumb_' + pid, dataUrl); } catch (e) {}
                  applyThumbToCard(pid, dataUrl);
                }
              }
            } catch (err) {
              console.warn('Gagal generate thumbnail untuk', pid, err);
            }

            await new Promise(r => setTimeout(r, 60));
          }

          isGeneratingQueue = false;
        }
        window.processMissingThumbnails = processMissingThumbnails;

        // Hook editor save & exit buttons
        function hookEditorThumbCapture() {
          const backHome = document.getElementById('backHome');
          if (backHome && !backHome._amHooked) {
            backHome._amHooked = true;
            backHome.addEventListener('click', () => {
              try { window.captureProjectThumbnail(1.0); } catch (e) {}
            }, true);
          }

          const saveBtn = document.getElementById('saveProject');
          if (saveBtn && !saveBtn._amHooked) {
            saveBtn._amHooked = true;
            saveBtn.addEventListener('click', () => {
              try { window.captureProjectThumbnail(1.0); } catch (e) {}
            }, true);
          }
        }

        // Initialize with engine wait
        function initThumbnailEngine() {
          syncExistingThumbnails();
          hookEditorThumbCapture();

          // Watch for projectList DOM updates
          const projectList = document.getElementById('projectList');
          if (projectList && !projectList._amObserved) {
            projectList._amObserved = true;
            const obs = new MutationObserver(() => {
              syncExistingThumbnails();
              setTimeout(processMissingThumbnails, 80);
              hookEditorThumbCapture();
            });
            obs.observe(projectList, { childList: true, subtree: true });
          }

          // Hook ui.loadProjectList if present
          const ui = getUI();
          if (ui && typeof ui.loadProjectList === 'function' && !ui._amThumbHooked) {
            ui._amThumbHooked = true;
            const origLoad = ui.loadProjectList.bind(ui);
            ui.loadProjectList = async function(...args) {
              const res = await origLoad(...args);
              syncExistingThumbnails();
              setTimeout(processMissingThumbnails, 80);
              return res;
            };
          }

          if (ui && typeof ui.saveLocal === 'function' && !ui._amSaveThumbHooked) {
            ui._amSaveThumbHooked = true;
            const origSave = ui.saveLocal.bind(ui);
            ui.saveLocal = async function(...args) {
              try { window.captureProjectThumbnail(1.0); } catch (e) {}
              const res = await origSave(...args);
              syncExistingThumbnails();
              return res;
            };
          }

          setTimeout(processMissingThumbnails, 150);
        }

        if (window.omsTimelinePreRender) {
          initThumbnailEngine();
        } else {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if (window.omsTimelinePreRender || attempts > 50) {
              clearInterval(interval);
              initThumbnailEngine();
            }
          }, 80);
        }
      }.toString()})();
    `;
    (document.head || document.documentElement).appendChild(script);
  };
    injectThumbnailEngine();

  // 5b. Desktop Engine: Anti-Jump Timeline, Anti-LongPress Mouse, & Multi-Select Media Relinker
  const injectDesktopEngine = () => {
    if (document.getElementById('am-desktop-engine')) return;

    try {
      const enginePath = path.join(__dirname, 'desktop-engine.js');
      if (fs.existsSync(enginePath)) {
        const code = fs.readFileSync(enginePath, 'utf8');
        const script = document.createElement('script');
        script.id = 'am-desktop-engine';
        script.textContent = code;
        (document.head || document.documentElement).appendChild(script);
      }
    } catch (err) {
      console.error('[AM-PC] Failed to inject desktop engine:', err);
    }
  };
  injectDesktopEngine();

  // 6. Global Android Touch Ripple & Micro-Press Engine
  const initRippleEngine = () => {
    if (window._amRippleInitialized) return;
    window._amRippleInitialized = true;

    document.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;

      const target = e.target.closest(
        'button, .topIcon, .rightBtn, .projectCard, .homeTab, .assetTabs button, ' +
        '.shapeItem, .toolBtn, .transport button, .amWebHeadBtn, .amWebTabBtn, ' +
        '.projectSelectionAction, .fabHome, .createBtn, .experimentalNoticeAccept, ' +
        '[role="button"], input[type="button"], input[type="submit"]'
      );

      if (!target || target.disabled || target.classList.contains('disabled')) return;

      if (window.getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('span');
      ripple.className = 'am-ripple-wave';
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';

      try {
        const cs = window.getComputedStyle(target);
        const bg = cs.backgroundColor || '';
        const isBright = target.classList.contains('experimentalNoticeAccept') ||
          target.classList.contains('createBtn') ||
          target.classList.contains('fabHome') ||
          bg.includes('255, 255, 255') ||
          bg.includes('94, 219, 181') ||
          bg.includes('0, 230, 118');

        if (isBright) {
          ripple.classList.add('am-ripple-dark');
        } else if (target.classList.contains('projectCard') || target.id === 'homeAMFinder' || target.id === 'homeAMHub') {
          ripple.classList.add('am-ripple-accent');
        }
      } catch (err) {}

      target.appendChild(ripple);
      setTimeout(() => {
        try { ripple.remove(); } catch (err) {}
      }, 550);
    }, true);
  };
  initRippleEngine();

  // 7. Universal Popup Container Transform Engine (Alight Motion PC)
  // Morphing scale-up from clicked trigger coordinates & reverse shrink for all popups
  const initUniversalPopupEngine = () => {
    if (window._amUniversalPopupInitialized) return;
    window._amUniversalPopupInitialized = true;

    window._amLastTrigger = null;

    const restoreFab = () => {
      const homeFab = document.getElementById('newProjectFab');
      if (homeFab) {
        homeFab.style.removeProperty('display');
        homeFab.style.removeProperty('pointer-events');
        homeFab.style.display = 'inline-flex';
        homeFab.style.pointerEvents = 'auto';
      }
    };

    // Global pointerdown tracker for opening coordinates
    document.addEventListener('pointerdown', (e) => {
      // Ignore clicks inside an active popup card unless clicking a close button
      const inCard = e.target.closest('.modal, .languageSheet, #layerActionsPopup, .experimentalNoticeCard, .amWebModalCard, .effectDetailCard, dialog');
      const isClose = e.target.closest('#closeNew, #languageClose, #layerActionsClose, #experimentalNoticeAccept, .experimentalNoticeAccept, .amWebClose, #amWebClose, [data-close], .cameraOrbitShortcutClose, .cameraLensShortcutClose');
      if (inCard && !isClose) return;

      const trigger = e.target.closest('button, .topIcon, .rightBtn, .projectCard, [role="button"], #newProjectFab, .fabHome');
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        window._amLastTrigger = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          target: trigger
        };
      } else {
        window._amLastTrigger = {
          x: e.clientX,
          y: e.clientY,
          target: e.target
        };
      }
    }, true);

    const setupPopup = (popupSelector, cardSelector, closeSelector, isAriaHidden = false) => {
      const popup = document.querySelector(popupSelector);
      if (!popup || popup._amBound) return;
      popup._amBound = true;

      const getCard = () => popup.querySelector(cardSelector) || popup;

      const closePopup = () => {
        if (popup._amClosing) return;
        popup._amClosing = true;

        const card = getCard();
        const trigger = popup._amOpenTrigger || window._amLastTrigger;
        if (card && trigger) {
          const cardRect = card.getBoundingClientRect();
          const ox = trigger.x - cardRect.left;
          const oy = trigger.y - cardRect.top;
          card.style.transformOrigin = `${ox}px ${oy}px`;
        }

        // Disable clicks on shade immediately during exit animation
        popup.style.pointerEvents = 'none';

        if (popup.classList.contains('am-morph-open')) {
          popup.classList.remove('am-morph-open');
        }
        popup.classList.add('am-morph-close');

        setTimeout(() => {
          if (popup.classList.contains('am-morph-open') || popup.classList.contains('am-morph-close')) {
            popup.classList.remove('am-morph-close', 'am-morph-open');
          }
          if (isAriaHidden) {
            popup.setAttribute('aria-hidden', 'true');
            if (popup.id === 'experimentalNotice') {
              sessionStorage.setItem('am_notice_dismissed_session', 'true');
              window.__omsExperimentalNoticeAccepted = true;
              try {
                window.dispatchEvent(new CustomEvent('oms:experimental-notice-accepted'));
              } catch (e) {}
            }
          } else {
            popup.classList.add('hidden');
          }
          popup.style.display = 'none';
          popup.style.removeProperty('pointer-events');
          popup._amClosing = false;

          if (popup.id === 'newModal') {
            restoreFab();
          }
        }, 200);
      };

      popup._amCloseHandler = closePopup;

      // Intercept close button clicks
      if (closeSelector) {
        document.addEventListener('click', (e) => {
          const btn = e.target.closest(closeSelector);
          if (btn && popup.contains(btn)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            closePopup();
          }
        }, true);
      }

      // Intercept backdrop clicks
      popup.addEventListener('pointerdown', (e) => {
        const card = getCard();
        if (e.target === popup || (card && !card.contains(e.target))) {
          e.preventDefault();
          e.stopPropagation();
          closePopup();
        }
      }, true);

      // Mutation observer to handle open/close animations
      const observer = new MutationObserver(() => {
        const isOpen = isAriaHidden
          ? popup.getAttribute('aria-hidden') !== 'true'
          : !popup.classList.contains('hidden');

        if (isOpen) {
          if (!popup._amClosing && !popup.classList.contains('am-morph-open')) {
            popup.style.removeProperty('display');
            popup.style.removeProperty('pointer-events');

            // Store snapshot of trigger
            if (window._amLastTrigger) {
              popup._amOpenTrigger = { ...window._amLastTrigger };
            } else if (popup.id === 'newModal') {
              const fab = document.getElementById('newProjectFab');
              if (fab) {
                const r = fab.getBoundingClientRect();
                popup._amOpenTrigger = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
              }
            }

            const card = getCard();
            if (card && popup._amOpenTrigger) {
              const cardRect = card.getBoundingClientRect();
              const ox = popup._amOpenTrigger.x - cardRect.left;
              const oy = popup._amOpenTrigger.y - cardRect.top;
              card.style.transformOrigin = `${ox}px ${oy}px`;
            }

            void popup.offsetWidth;
            popup.classList.add('am-morph-open');
          }
        } else {
          // Closed state: only remove classes IF currently present to eliminate infinite mutation loops!
          if (popup.classList.contains('am-morph-open') || popup.classList.contains('am-morph-close')) {
            popup.classList.remove('am-morph-open', 'am-morph-close');
          }
          if (popup.style.display !== 'none') {
            popup.style.display = 'none';
          }
          popup.style.pointerEvents = 'none';
          if (popup.id === 'newModal') {
            restoreFab();
          }
        }
      });

      observer.observe(popup, { attributes: true, attributeFilter: isAriaHidden ? ['aria-hidden'] : ['class'] });
    };

    // Bind all popups
    setupPopup('#newModal', '.modal', '#closeNew');
    setupPopup('#languageModal', '.languageSheet', '#languageClose');
    setupPopup('#layerActionsShade', '#layerActionsPopup', '#layerActionsClose');
    setupPopup('#experimentalNotice', '.experimentalNoticeCard', '#experimentalNoticeAccept, .experimentalNoticeAccept', true);
    setupPopup('.amWebModal', '.amWebModalCard', '.amWebClose, #amWebClose');

    // Global Escape key dismiss handler
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;

      const activePopup = document.querySelector(
        '#newModal:not(.hidden), #languageModal:not(.hidden), #layerActionsShade:not(.hidden), ' +
        '#experimentalNotice:not([aria-hidden="true"]), .amWebModal:not(.hidden)'
      );

      if (activePopup && !activePopup._amClosing) {
        e.preventDefault();
        e.stopImmediatePropagation();
        activePopup._amCloseHandler?.();
      }
    }, true);
  };
  initUniversalPopupEngine();

  // Observer to maintain brand & drawer docking on view switches
  const appContainer = document.querySelector('.app') || document.body;
  if (appContainer) {
    const observer = new MutationObserver(() => {
      dockDrawer();
      updateBrand();
      updateNotice();
      mountActionButtons();
      injectThumbnailEngine();
      injectDesktopEngine();
      initUniversalPopupEngine();
    });
    observer.observe(appContainer, { childList: true, subtree: true });
  }
});

