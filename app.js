/* ══════════════════════════════════════════════════════
   GEOSURVEY PRO — Complete Application Logic
   ══════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════
//  STATE & STORAGE
// ═══════════════════════════════════════════

const STATE = {
  surveys: [],
  currentGPS: null,
  capturedPhotos: [],
  customFields: [],
  cameraStream: null,
  facingMode: 'environment',
  currentPage: 'dashboard',
  dashMap: null,
  mainMap: null,
  captureMiniMap: null,
  detailMap: null,
  mapMarkers: [],
  customFieldCount: 0,
  editingId: null,
  watermarkEnabled: true,
};

const STORAGE_KEY = 'geosurvey_pro_v2';

function saveToStorage() {
  try {
    const data = STATE.surveys.map(s => ({
      ...s,
      photos: s.photos.map(p => ({ ...p, dataUrl: p.dataUrl })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    showToast('warning', 'Storage Warning', 'Could not save to local storage — data may be lost on refresh.');
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) STATE.surveys = JSON.parse(raw);
  } catch (e) {
    STATE.surveys = [];
  }
}

// Category colors map
const CAT_COLORS = {
  Infrastructure: '#f97316',
  Agriculture:    '#22c55e',
  Environment:    '#3b82f6',
  Property:       '#a855f7',
  Road:           '#ef4444',
  Water:          '#06b6d4',
  Health:         '#f59e0b',
  Education:      '#ec4899',
  Other:          '#6b7280',
};

const CAT_EMOJI = {
  Infrastructure: '🏗️', Agriculture: '🌾', Environment: '🌿',
  Property: '🏘️', Road: '🛣️', Water: '💧',
  Health: '🏥', Education: '🏫', Other: '📋',
};

const PRIORITY_CONFIG = {
  Normal: { cls: 'badge-normal', label: '🟢 Normal' },
  High:   { cls: 'badge-high',   label: '🟡 High' },
  Urgent: { cls: 'badge-urgent', label: '🔴 Urgent' },
};

// ═══════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════

function uuid() {
  return 'SRV-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(ts) {
  return formatDate(ts) + ' · ' + formatTime(ts);
}

function formatCoord(val, isLat) {
  if (val == null) return '--';
  const abs = Math.abs(val);
  const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
  return abs.toFixed(6) + '° ' + dir;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return '☀️ Good Morning';
  if (h < 17) return '🌤 Good Afternoon';
  return '🌙 Good Evening';
}

function isToday(ts) {
  const d = new Date(ts);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

// ═══════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════

function showToast(type, title, msg, dur = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
    <span class="toast-close" onclick="dismissToast(this.parentElement)">✕</span>`;
  container.appendChild(el);
  setTimeout(() => dismissToast(el), dur);
}

function dismissToast(el) {
  if (!el || !el.parentElement) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 300);
}

// ═══════════════════════════════════════════
//  SPLASH SCREEN
// ═══════════════════════════════════════════

function initSplash() {
  // Animate particles
  const pContainer = document.getElementById('splashParticles');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'splash-particle';
    p.style.cssText = `left:${Math.random()*100}%;animation-delay:${Math.random()*2}s;animation-duration:${2+Math.random()*2}s`;
    pContainer.appendChild(p);
  }

  const statusMsgs = [
    'Initializing GPS services...',
    'Loading map tiles...',
    'Preparing camera modules...',
    'Restoring saved surveys...',
    'Ready to capture! 🚀',
  ];
  let idx = 0;
  const statusEl = document.getElementById('splashStatus');
  const interval = setInterval(() => {
    idx++;
    if (idx < statusMsgs.length) statusEl.textContent = statusMsgs[idx];
    else clearInterval(interval);
  }, 400);

  setTimeout(() => {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      splash.remove();
      app.classList.remove('app-hidden');
      initApp();
    }, 500);
  }, 2400);
}

// ═══════════════════════════════════════════
//  APP INITIALIZATION
// ═══════════════════════════════════════════

function initApp() {
  loadFromStorage();

  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Topbar new survey
  document.getElementById('newSurveyTopBtn').addEventListener('click', () => navigateTo('capture'));

  // Sidebar toggle (mobile)
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Theme toggle
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
    document.getElementById('themeBtn').textContent = e.target.checked ? '🌙' : '☀️';
  });

  // Watermark setting
  document.getElementById('watermarkToggle').addEventListener('change', (e) => {
    STATE.watermarkEnabled = e.target.checked;
  });

  // Sync button
  document.getElementById('syncBtn').addEventListener('click', () => {
    showToast('info', 'Syncing...', 'All records are saved locally. Cloud sync coming soon!');
  });

  // Camera
  document.getElementById('startCamBtn').addEventListener('click', startCamera);
  document.getElementById('shutterBtn').addEventListener('click', capturePhoto);
  document.getElementById('switchCamBtn').addEventListener('click', switchCamera);
  document.getElementById('torchBtn').addEventListener('click', toggleTorch);
  document.getElementById('clearPhotosBtn').addEventListener('click', clearPhotos);

  // Survey form
  document.getElementById('submitSurveyBtn').addEventListener('click', submitSurvey);
  document.getElementById('addFieldBtn').addEventListener('click', openFieldModal);
  document.getElementById('gpsRefreshBtn').addEventListener('click', captureGPS);

  // Category -> VF label
  document.getElementById('surveyCategory').addEventListener('change', (e) => {
    const vfLabel = document.getElementById('vfCatLabel');
    vfLabel.textContent = e.target.value ? (CAT_EMOJI[e.target.value] + ' ' + e.target.value) : '— Select Category —';
  });

  // Records filters
  document.getElementById('searchInput').addEventListener('input', renderRecords);
  document.getElementById('filterCat').addEventListener('change', renderRecords);
  document.getElementById('filterPriority').addEventListener('change', renderRecords);
  document.getElementById('filterSort').addEventListener('change', renderRecords);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  // Custom field type change
  document.getElementById('fieldType').addEventListener('change', (e) => {
    document.getElementById('fieldOptionsGroup').style.display =
      e.target.value === 'select' ? 'block' : 'none';
  });

  // Modal overlay close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  });

  // Init GPS
  startGPS();

  // Init dashboard
  renderDashboard();
  initDashMiniMap();
  updateClock();
  setInterval(updateClock, 1000);
  updateVFClock();
  setInterval(updateVFClock, 1000);

  // Survey ID badge
  updateSurveyIdBadge();

  // Storage info
  updateStorageInfo();

  // Settings name sync
  document.getElementById('settingName').addEventListener('change', (e) => {
    document.querySelector('.user-name').textContent = e.target.value;
    document.getElementById('surveyorName').value = e.target.value;
  });
}

// ═══════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  capture:   'New Survey',
  records:   'Survey Records',
  map:       'Map View',
  analytics: 'Analytics',
  settings:  'Settings',
};

function navigateTo(pageId) {
  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-btn[data-page="${pageId}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Update topbar title
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[pageId] || pageId;

  STATE.currentPage = pageId;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  // Page-specific inits
  if (pageId === 'records') renderRecords();
  if (pageId === 'map') initMainMap();
  if (pageId === 'analytics') renderAnalytics();
  if (pageId === 'dashboard') renderDashboard();
}

// ═══════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
  document.getElementById('darkModeToggle').checked = !isDark;
}

// ═══════════════════════════════════════════
//  GPS
// ═══════════════════════════════════════════

function startGPS() {
  if (!navigator.geolocation) {
    updateGPSUI(null, 'GPS not supported');
    return;
  }

  document.getElementById('gpsDot').className = 'gps-dot searching';
  document.getElementById('gpsStatusText').textContent = 'Searching for GPS...';

  navigator.geolocation.watchPosition(
    (pos) => {
      STATE.currentGPS = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        alt: pos.coords.altitude,
        acc: pos.coords.accuracy,
        ts: Date.now(),
      };
      updateGPSUI(STATE.currentGPS);
    },
    (err) => {
      // Use demo coords (Nagpur, India) if GPS denied
      STATE.currentGPS = {
        lat: 21.1458 + (Math.random() - 0.5) * 0.01,
        lng: 79.0882 + (Math.random() - 0.5) * 0.01,
        alt: 310,
        acc: 15 + Math.random() * 10,
        ts: Date.now(),
        demo: true,
      };
      updateGPSUI(STATE.currentGPS, 'Demo GPS (permission denied)');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  );
}

function updateGPSUI(gps, errMsg) {
  const dot = document.getElementById('gpsDot');
  const statusText = document.getElementById('gpsStatusText');
  const coordText = document.getElementById('coordText');
  const capText = document.getElementById('gpsCapText');
  const vfCoords = document.getElementById('vfCoords');
  const pulseDot = document.querySelector('.gps-pulse');

  if (errMsg) {
    dot.className = 'gps-dot';
    statusText.textContent = errMsg;
  }

  if (!gps) return;

  const locked = !gps.demo;
  dot.className = 'gps-dot ' + (locked ? 'locked' : 'searching');
  statusText.textContent = locked
    ? `GPS Locked · ±${Math.round(gps.acc)}m`
    : `Demo mode · ±${Math.round(gps.acc)}m`;

  const latStr = gps.lat.toFixed(6);
  const lngStr = gps.lng.toFixed(6);
  coordText.textContent = `${latStr}, ${lngStr}`;

  if (vfCoords) {
    vfCoords.textContent = `${latStr}, ${lngStr}`;
  }

  // Capture form fields
  const capLat = document.getElementById('capLat');
  const capLng = document.getElementById('capLng');
  const capAcc = document.getElementById('capAcc');
  if (capLat) capLat.value = latStr;
  if (capLng) capLng.value = lngStr;
  if (capAcc) capAcc.value = `±${Math.round(gps.acc)}m`;
  if (capText) {
    capText.textContent = locked ? '✅ GPS Locked' : '⚠️ Demo GPS Active';
  }
  if (pulseDot) pulseDot.className = 'gps-pulse ' + (locked ? 'locked' : '');

  // GPS card details
  const detLat = document.getElementById('detLat');
  const detLng = document.getElementById('detLng');
  const detAlt = document.getElementById('detAlt');
  const detAcc = document.getElementById('detAcc');
  const detSignal = document.getElementById('detSignal');
  if (detLat) detLat.textContent = formatCoord(gps.lat, true);
  if (detLng) detLng.textContent = formatCoord(gps.lng, false);
  if (detAlt) detAlt.textContent = gps.alt ? Math.round(gps.alt) + 'm' : 'N/A';
  if (detAcc) detAcc.textContent = `±${Math.round(gps.acc)}m`;
  if (detSignal) {
    detSignal.textContent = locked ? '📡 Strong' : '⚠️ Demo';
    detSignal.style.color = locked ? 'var(--green)' : 'var(--amber)';
  }

  // GPS accuracy ring (0-100 scale, better = higher)
  const gpsRing = document.getElementById('gpsRing');
  const gpsAccVal = document.getElementById('gpsAccValue');
  if (gpsRing) {
    const pct = Math.max(0, Math.min(100, 100 - (gps.acc / 50) * 100));
    gpsRing.style.background = `conic-gradient(var(--green) ${pct}%, var(--bg3) 0%)`;
    if (gpsAccVal) gpsAccVal.textContent = Math.round(gps.acc);
  }

  // Reverse geocode (demo)
  fetchAddress(gps.lat, gps.lng);

  // Update mini capture map
  updateCaptureMiniMap(gps.lat, gps.lng);
}

function captureGPS() {
  if (STATE.currentGPS) {
    updateGPSUI(STATE.currentGPS);
    showToast('success', 'GPS Refreshed', `Location: ${STATE.currentGPS.lat.toFixed(5)}, ${STATE.currentGPS.lng.toFixed(5)}`);
  } else {
    startGPS();
    showToast('info', 'Refreshing GPS...', 'Attempting to re-acquire GPS signal.');
  }
}

async function fetchAddress(lat, lng) {
  const addrInput = document.getElementById('capAddress');
  if (!addrInput) return;

  // Demo address generation based on coords
  const areas = ['MG Road', 'Civil Lines', 'Dharampeth', 'Ramdaspeth', 'Sadar Bazaar', 'Itwari', 'Sitabuldi'];
  const cities = ['Nagpur', 'Pune', 'Mumbai', 'Nashik'];
  const area = areas[Math.floor(Math.abs(lat * 1000)) % areas.length];
  const city = cities[Math.floor(Math.abs(lng * 100)) % cities.length];
  addrInput.value = `${area}, ${city}, Maharashtra, India`;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.display_name) addrInput.value = data.display_name;
    }
  } catch (_) { /* use demo address */ }
}

// ═══════════════════════════════════════════
//  CAMERA
// ═══════════════════════════════════════════

async function startCamera() {
  try {
    if (STATE.cameraStream) {
      STATE.cameraStream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
      video: {
        facingMode: STATE.facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    STATE.cameraStream = stream;

    const video = document.getElementById('cameraVideo');
    video.srcObject = stream;
    video.classList.add('active');

    document.getElementById('cameraPlaceholder').style.display = 'none';
    showToast('success', 'Camera Active 📷', 'Point at the survey site and press the shutter button.');
  } catch (err) {
    showToast('error', 'Camera Error', `Could not access camera: ${err.message}. Check browser permissions.`);
  }
}

async function switchCamera() {
  STATE.facingMode = STATE.facingMode === 'environment' ? 'user' : 'environment';
  if (STATE.cameraStream) await startCamera();
  else showToast('info', 'Camera not started', 'Start the camera first, then switch.');
}

function toggleTorch() {
  if (!STATE.cameraStream) return;
  const track = STATE.cameraStream.getVideoTracks()[0];
  if (!track) return;
  const caps = track.getCapabilities();
  if (caps && caps.torch) {
    const settings = track.getSettings();
    track.applyConstraints({ advanced: [{ torch: !settings.torch }] });
    showToast('info', settings.torch ? 'Flash Off' : 'Flash On', '');
  } else {
    showToast('warning', 'Flash Not Supported', 'Your device does not support torch control.');
  }
}

function capturePhoto() {
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');

  if (!STATE.cameraStream || !video.srcObject) {
    showToast('warning', 'Camera not started', 'Please start the camera first before capturing.');
    return;
  }

  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');

  // Mirror if front camera
  if (STATE.facingMode === 'user') {
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
  } else {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  // Watermark
  if (STATE.watermarkEnabled) applyWatermark(ctx, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const photoObj = {
    id: 'PH-' + Date.now(),
    dataUrl,
    ts: Date.now(),
    lat: STATE.currentGPS?.lat,
    lng: STATE.currentGPS?.lng,
    acc: STATE.currentGPS?.acc,
  };

  STATE.capturedPhotos.push(photoObj);
  renderPhotoGrid();
  flashEffect();
  showToast('success', `Photo Captured! 📸`, `${STATE.capturedPhotos.length} photo(s) ready.`);
}

function applyWatermark(ctx, W, H) {
  const gps = STATE.currentGPS;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN') + ' ' + now.toLocaleTimeString('en-IN');
  const latStr = gps ? gps.lat.toFixed(6) : 'N/A';
  const lngStr = gps ? gps.lng.toFixed(6) : 'N/A';
  const accStr = gps ? `±${Math.round(gps.acc)}m` : '';

  const lines = [
    `📍 ${latStr}, ${lngStr}  ${accStr}`,
    `🕐 ${dateStr}`,
    `📷 GeoSurvey Pro`,
  ];

  const fontSize = Math.max(14, Math.floor(H * 0.022));
  const padding = 10;
  const lineHeight = fontSize * 1.5;
  const totalH = lines.length * lineHeight + padding * 2;
  const bgY = H - totalH - padding;

  // Semi-transparent background strip
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, bgY, W, totalH + padding);

  ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    const y = bgY + padding + (i + 1) * lineHeight - 4;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText(line, padding + 1, y + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, padding, y);
  });

  // Orange accent line
  ctx.fillStyle = '#f97316';
  ctx.fillRect(0, bgY, 4, totalH + padding);
}

function flashEffect() {
  const vf = document.getElementById('cameraViewfinder');
  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:0.8;pointer-events:none;z-index:10;animation:flashFade 0.3s ease forwards;border-radius:inherit';
  const style = document.createElement('style');
  style.textContent = '@keyframes flashFade{from{opacity:0.8}to{opacity:0}}';
  document.head.appendChild(style);
  vf.appendChild(flash);
  setTimeout(() => flash.remove(), 350);
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  const countBadge = document.getElementById('photoCount');
  const clearBtn = document.getElementById('clearPhotosBtn');

  countBadge.textContent = STATE.capturedPhotos.length;
  clearBtn.style.display = STATE.capturedPhotos.length > 0 ? 'block' : 'none';

  if (STATE.capturedPhotos.length === 0) {
    grid.innerHTML = `<div class="photo-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
      <span>No photos yet</span>
    </div>`;
    return;
  }

  grid.innerHTML = STATE.capturedPhotos.map((ph, i) => `
    <div class="photo-thumb" onclick="viewPhoto('${ph.id}')">
      <img src="${ph.dataUrl}" alt="Photo ${i + 1}" loading="lazy"/>
      <button class="photo-del" onclick="event.stopPropagation();deletePhoto('${ph.id}')">✕</button>
    </div>`).join('');
}

function deletePhoto(id) {
  STATE.capturedPhotos = STATE.capturedPhotos.filter(p => p.id !== id);
  renderPhotoGrid();
  showToast('info', 'Photo Removed', '');
}

function clearPhotos() {
  if (STATE.capturedPhotos.length === 0) return;
  if (!confirm(`Delete all ${STATE.capturedPhotos.length} captured photos?`)) return;
  STATE.capturedPhotos = [];
  renderPhotoGrid();
  showToast('info', 'Photos Cleared', '');
}

function viewPhoto(id) {
  const ph = STATE.capturedPhotos.find(p => p.id === id);
  if (!ph) return;
  document.getElementById('photoModalImg').src = ph.dataUrl;
  document.getElementById('photoModalInfo').textContent =
    `📍 ${ph.lat?.toFixed(6) ?? 'N/A'}, ${ph.lng?.toFixed(6) ?? 'N/A'}  ·  🕐 ${new Date(ph.ts).toLocaleString('en-IN')}`;
  document.getElementById('photoModal').classList.add('open');
}

function closePhotoModal() {
  document.getElementById('photoModal').classList.remove('open');
}

// ═══════════════════════════════════════════
//  CUSTOM FIELDS
// ═══════════════════════════════════════════

function openFieldModal() {
  document.getElementById('fieldLabel').value = '';
  document.getElementById('fieldType').value = 'text';
  document.getElementById('fieldOptions').value = '';
  document.getElementById('fieldOptionsGroup').style.display = 'none';
  document.getElementById('fieldModal').classList.add('open');
}

function closeFieldModal() {
  document.getElementById('fieldModal').classList.remove('open');
}

function addCustomField() {
  const label = document.getElementById('fieldLabel').value.trim();
  const type = document.getElementById('fieldType').value;
  const options = document.getElementById('fieldOptions').value.trim();

  if (!label) {
    showToast('error', 'Label required', 'Please enter a field label.');
    return;
  }

  const fieldId = 'cf_' + (++STATE.customFieldCount);
  STATE.customFields.push({ id: fieldId, label, type, options });

  renderCustomFields();
  closeFieldModal();
  showToast('success', 'Field Added', `"${label}" field is now on the form.`);
}

function renderCustomFields() {
  const container = document.getElementById('customFields');
  container.innerHTML = STATE.customFields.map(f => {
    let inputHtml = '';
    switch (f.type) {
      case 'text':
        inputHtml = `<input type="text" id="${f.id}" class="form-input" placeholder="Enter ${f.label.toLowerCase()}..."/>`;
        break;
      case 'number':
        inputHtml = `<input type="number" id="${f.id}" class="form-input" placeholder="0"/>`;
        break;
      case 'textarea':
        inputHtml = `<textarea id="${f.id}" class="form-input" rows="2" placeholder="Enter details..."></textarea>`;
        break;
      case 'checkbox':
        inputHtml = `<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:400;cursor:pointer">
          <input type="checkbox" id="${f.id}" style="width:auto;border:none;background:none;padding:0"/>
          ${f.label}
        </label>`;
        break;
      case 'select':
        const opts = f.options.split(',').map(o => o.trim()).filter(Boolean);
        inputHtml = `<select id="${f.id}" class="form-input">
          <option value="">Select...</option>
          ${opts.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>`;
        break;
      default:
        inputHtml = `<input type="text" id="${f.id}" class="form-input"/>`;
    }

    return `<div class="custom-field-item">
      <div class="custom-field-content">
        ${f.type !== 'checkbox' ? `<label>${f.label}</label>` : ''}
        ${inputHtml}
      </div>
      <button class="custom-field-remove" onclick="removeCustomField('${f.id}')">✕</button>
    </div>`;
  }).join('');
}

function removeCustomField(id) {
  STATE.customFields = STATE.customFields.filter(f => f.id !== id);
  renderCustomFields();
}

// ═══════════════════════════════════════════
//  SUBMIT SURVEY
// ═══════════════════════════════════════════

function updateSurveyIdBadge() {
  const next = '#SRV-' + String(STATE.surveys.length + 1).padStart(4, '0');
  const badge = document.getElementById('surveyIdBadge');
  if (badge) badge.textContent = next;
}

function submitSurvey() {
  const title = document.getElementById('surveyTitle').value.trim();
  const category = document.getElementById('surveyCategory').value;
  const priority = document.getElementById('surveyPriority').value;
  const description = document.getElementById('surveyDesc').value.trim();
  const siteName = document.getElementById('siteName').value.trim();
  const surveyorName = document.getElementById('surveyorName').value.trim();
  const condition = document.getElementById('surveyCondition').value;
  const estimatedCost = document.getElementById('estimatedCost').value;
  const address = document.getElementById('capAddress').value;

  if (!title) { showToast('error', 'Title Required', 'Please enter a survey title.'); return; }
  if (!category) { showToast('error', 'Category Required', 'Please select a category.'); return; }

  const customData = {};
  STATE.customFields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) {
      customData[f.label] = f.type === 'checkbox' ? el.checked : el.value;
    }
  });

  const survey = {
    id: uuid(),
    seqId: STATE.surveys.length + 1,
    title,
    category,
    priority,
    description,
    siteName,
    surveyorName,
    condition,
    estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
    address,
    lat: STATE.currentGPS?.lat ?? null,
    lng: STATE.currentGPS?.lng ?? null,
    acc: STATE.currentGPS?.acc ?? null,
    photos: STATE.capturedPhotos.map(p => ({ ...p })),
    customFields: STATE.customFields.map(f => ({ ...f })),
    customData,
    ts: Date.now(),
    synced: false,
  };

  STATE.surveys.unshift(survey);
  saveToStorage();

  // Reset form
  resetCaptureForm();

  // Update nav badge
  document.getElementById('recordCount').textContent = STATE.surveys.length;

  // Update KPIs
  renderDashboard();
  updateSurveyIdBadge();

  showToast('success', 'Survey Saved! ✅', `"${title}" has been recorded with ${survey.photos.length} photo(s).`);
  setTimeout(() => navigateTo('records'), 800);
}

function resetCaptureForm() {
  document.getElementById('surveyTitle').value = '';
  document.getElementById('surveyCategory').value = '';
  document.getElementById('surveyDesc').value = '';
  document.getElementById('siteName').value = '';
  document.getElementById('estimatedCost').value = '';
  document.getElementById('surveyPriority').value = 'Normal';
  document.getElementById('surveyCondition').value = 'Good';
  STATE.customFields = [];
  STATE.capturedPhotos = [];
  renderCustomFields();
  renderPhotoGrid();
  document.getElementById('vfCatLabel').textContent = '— Select Category —';
}

// ═══════════════════════════════════════════
//  MAPS
// ═══════════════════════════════════════════

const MAP_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTR = '© OpenStreetMap contributors';
const DEFAULT_CENTER = [21.1458, 79.0882]; // Nagpur

function initDashMiniMap() {
  const el = document.getElementById('dashMiniMap');
  if (!el || STATE.dashMap) return;
  const center = STATE.currentGPS
    ? [STATE.currentGPS.lat, STATE.currentGPS.lng]
    : DEFAULT_CENTER;

  STATE.dashMap = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false }).setView(center, 12);
  L.tileLayer(MAP_TILE, { attribution: MAP_ATTR }).addTo(STATE.dashMap);

  if (STATE.currentGPS) {
    L.circleMarker([STATE.currentGPS.lat, STATE.currentGPS.lng], {
      radius: 8, color: '#f97316', fillColor: '#f97316', fillOpacity: 0.8, weight: 2,
    }).addTo(STATE.dashMap);
  }
}

function initMainMap() {
  const el = document.getElementById('mainMap');
  if (!el) return;

  if (!STATE.mainMap) {
    const center = STATE.currentGPS
      ? [STATE.currentGPS.lat, STATE.currentGPS.lng]
      : DEFAULT_CENTER;
    STATE.mainMap = L.map(el, { zoomControl: true }).setView(center, 13);
    L.tileLayer(MAP_TILE, { attribution: MAP_ATTR }).addTo(STATE.mainMap);
  }

  // Clear old markers
  STATE.mapMarkers.forEach(m => STATE.mainMap.removeLayer(m));
  STATE.mapMarkers = [];

  // Add current location
  if (STATE.currentGPS) {
    const selfMarker = L.circleMarker(
      [STATE.currentGPS.lat, STATE.currentGPS.lng],
      { radius: 10, color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }
    ).addTo(STATE.mainMap).bindPopup('<strong>📍 You are here</strong>');
    STATE.mapMarkers.push(selfMarker);
  }

  // Add survey markers
  const pointsList = document.getElementById('mapPointsList');
  const mapCount = document.getElementById('mapCount');

  const surveysWithGPS = STATE.surveys.filter(s => s.lat && s.lng);
  mapCount.textContent = surveysWithGPS.length;

  pointsList.innerHTML = surveysWithGPS.length === 0
    ? '<div class="empty-state small"><p>No geo-tagged surveys yet</p></div>'
    : '';

  surveysWithGPS.forEach(survey => {
    const color = CAT_COLORS[survey.category] || '#6b7280';

    const iconSvg = `<svg width="24" height="32" viewBox="0 0 24 32" fill="none"><path d="M12 0C5.373 0 0 5.373 0 12C0 18.627 12 32 12 32C12 32 24 18.627 24 12C24 5.373 18.627 0 12 0Z" fill="${color}"/><circle cx="12" cy="12" r="6" fill="white" opacity="0.9"/></svg>`;
    const icon = L.divIcon({
      html: iconSvg,
      className: '',
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      popupAnchor: [0, -32],
    });

    const marker = L.marker([survey.lat, survey.lng], { icon })
      .addTo(STATE.mainMap)
      .bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;margin-bottom:4px">${survey.title}</div>
          <div style="font-size:12px;color:#888;margin-bottom:4px">${CAT_EMOJI[survey.category] || ''} ${survey.category} · ${survey.priority}</div>
          <div style="font-size:11px;font-family:monospace;color:#666">${survey.lat.toFixed(5)}, ${survey.lng.toFixed(5)}</div>
          <div style="font-size:11px;color:#888;margin-top:4px">${formatDateTime(survey.ts)}</div>
          ${survey.photos.length > 0 ? `<img src="${survey.photos[0].dataUrl}" style="width:100%;border-radius:6px;margin-top:8px;max-height:80px;object-fit:cover"/>` : ''}
        </div>`);

    STATE.mapMarkers.push(marker);

    // Sidebar list item
    const item = document.createElement('div');
    item.className = 'map-point-item';
    item.innerHTML = `
      <div class="map-point-title">${survey.title}</div>
      <div class="map-point-coords">${survey.lat.toFixed(5)}, ${survey.lng.toFixed(5)}</div>`;
    item.addEventListener('click', () => {
      STATE.mainMap.setView([survey.lat, survey.lng], 16);
      marker.openPopup();
    });
    pointsList.appendChild(item);
  });

  // Fit bounds if multiple markers
  if (surveysWithGPS.length > 1) {
    const lats = surveysWithGPS.map(s => s.lat);
    const lngs = surveysWithGPS.map(s => s.lng);
    STATE.mainMap.fitBounds([
      [Math.min(...lats) - 0.005, Math.min(...lngs) - 0.005],
      [Math.max(...lats) + 0.005, Math.max(...lngs) + 0.005],
    ]);
  }

  setTimeout(() => STATE.mainMap.invalidateSize(), 100);
}

function initCaptureMiniMapOnce() {
  const el = document.getElementById('captureMiniMap');
  if (!el || STATE.captureMiniMap) return;
  const center = STATE.currentGPS
    ? [STATE.currentGPS.lat, STATE.currentGPS.lng]
    : DEFAULT_CENTER;
  STATE.captureMiniMap = L.map(el, { zoomControl: false, attributionControl: false }).setView(center, 15);
  L.tileLayer(MAP_TILE, { attribution: MAP_ATTR }).addTo(STATE.captureMiniMap);
}

function updateCaptureMiniMap(lat, lng) {
  initCaptureMiniMapOnce();
  if (!STATE.captureMiniMap) return;
  STATE.captureMiniMap.setView([lat, lng], 15);

  if (STATE._capturePinMarker) {
    STATE._capturePinMarker.setLatLng([lat, lng]);
  } else {
    STATE._capturePinMarker = L.circleMarker([lat, lng], {
      radius: 8, color: '#f97316', fillColor: '#f97316', fillOpacity: 0.9, weight: 2,
    }).addTo(STATE.captureMiniMap);
  }
}

// ═══════════════════════════════════════════
//  DASHBOARD RENDER
// ═══════════════════════════════════════════

function renderDashboard() {
  // Greeting
  const greetEl = document.getElementById('dashGreeting');
  if (greetEl) greetEl.textContent = greeting();

  // KPIs
  const total = STATE.surveys.length;
  const photos = STATE.surveys.reduce((a, s) => a + s.photos.length, 0);
  const withGPS = STATE.surveys.filter(s => s.lat && s.lng).length;
  const today = STATE.surveys.filter(s => isToday(s.ts)).length;

  animateCount('kpiTotal', total);
  animateCount('kpiPhotos', photos);
  animateCount('kpiLocations', withGPS);
  animateCount('kpiToday', today);

  // Nav badges
  document.getElementById('recordCount').textContent = total;

  // Recent surveys
  renderRecentList();

  // Activity timeline
  renderActivityTimeline();

  // Category chart
  drawCategoryChart();
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  if (diff === 0) return;
  const steps = 20;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(start + (diff * step / steps));
    if (step >= steps) clearInterval(timer);
  }, 20);
}

function renderRecentList() {
  const list = document.getElementById('recentList');
  if (!list) return;

  if (STATE.surveys.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
      <p>No surveys yet. Start your first capture!</p>
    </div>`;
    return;
  }

  list.innerHTML = STATE.surveys.slice(0, 6).map(s => {
    const cfg = PRIORITY_CONFIG[s.priority] || PRIORITY_CONFIG.Normal;
    const color = CAT_COLORS[s.category] || '#6b7280';
    return `<div class="recent-item" onclick="showDetail('${s.id}')">
      <div class="recent-cat-dot" style="background:${color}"></div>
      <div class="recent-info">
        <div class="recent-title">${s.title}</div>
        <div class="recent-meta">${CAT_EMOJI[s.category] || ''} ${s.category} · ${s.surveyorName} · ${formatDateTime(s.ts)}</div>
      </div>
      <span class="recent-badge ${cfg.cls}">${s.priority}</span>
    </div>`;
  }).join('');
}

function renderActivityTimeline() {
  const container = document.getElementById('activityTimeline');
  if (!container) return;

  const todayItems = STATE.surveys.filter(s => isToday(s.ts));

  if (todayItems.length === 0) {
    container.innerHTML = '<div class="empty-state small"><p>No activity today yet</p></div>';
    return;
  }

  container.innerHTML = todayItems.slice(0, 5).map(s => `
    <div class="tl-item">
      <div class="tl-dot" style="background:${CAT_COLORS[s.category] || '#f97316'}"></div>
      <div class="tl-content">
        <strong>${s.title}</strong>
        <div class="tl-time">${formatTime(s.ts)} · ${s.category} · ${s.photos.length} photo(s)</div>
      </div>
    </div>`).join('');
}

function drawCategoryChart() {
  const canvas = document.getElementById('catChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const counts = {};
  STATE.surveys.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#4d6357' : '#9ca3af';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data yet', W / 2, H / 2);

    const legend = document.getElementById('catLegend');
    if (legend) legend.innerHTML = '';
    return;
  }

  const total = entries.reduce((a, b) => a + b[1], 0);
  let startAngle = -Math.PI / 2;
  const cx = W / 2, cy = H / 2 - 10, r = 75;

  entries.forEach(([cat, count]) => {
    const slice = (count / total) * Math.PI * 2;
    const color = CAT_COLORS[cat] || '#6b7280';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'var(--bg1)';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += slice;
  });

  // Center hole
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? '#111814' : '#ffffff';
  ctx.fill();
  ctx.fillStyle = isDark ? '#f0f4f1' : '#111814';
  ctx.font = 'bold 18px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 6);
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = isDark ? '#4d6357' : '#9ca3af';
  ctx.fillText('surveys', cx, cy + 10);

  // Legend
  const legend = document.getElementById('catLegend');
  if (legend) {
    legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px';
    legend.innerHTML = entries.map(([cat, count]) => `
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text2)">
        <span style="width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[cat] || '#6b7280'};display:inline-block"></span>
        ${cat} (${count})
      </div>`).join('');
  }
}

// ═══════════════════════════════════════════
//  RECORDS PAGE
// ═══════════════════════════════════════════

let recordsView = 'grid';

function setRecordsView(v) {
  recordsView = v;
  document.getElementById('vtGrid').classList.toggle('active', v === 'grid');
  document.getElementById('vtList').classList.toggle('active', v === 'list');
  renderRecords();
}

function renderRecords() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const catFilter = document.getElementById('filterCat').value;
  const priFilter = document.getElementById('filterPriority').value;
  const sort = document.getElementById('filterSort').value;

  let filtered = [...STATE.surveys].filter(s => {
    const matchCat = !catFilter || s.category === catFilter;
    const matchPri = !priFilter || s.priority === priFilter;
    const matchSearch = !search || [s.title, s.category, s.address, s.surveyorName, s.description]
      .some(v => (v || '').toLowerCase().includes(search));
    return matchCat && matchPri && matchSearch;
  });

  if (sort === 'oldest') filtered.reverse();
  else if (sort === 'category') filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''));

  document.getElementById('recordsCountLabel').textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

  const grid = document.getElementById('recordsGrid');
  grid.className = `records-grid${recordsView === 'list' ? ' list-view' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:80px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="56" height="56"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      <p style="font-size:15px;color:var(--text2)">No surveys found</p>
      <p>Try changing your filters or start a new survey capture.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(s => buildRecordCard(s)).join('');
}

function buildRecordCard(s) {
  const cfg = PRIORITY_CONFIG[s.priority] || PRIORITY_CONFIG.Normal;
  const hasPhoto = s.photos && s.photos.length > 0;
  const thumbSrc = hasPhoto ? s.photos[0].dataUrl : '';

  const imgSection = hasPhoto
    ? `<div class="record-card-img">
        <img src="${thumbSrc}" alt="${s.title}" loading="lazy"/>
        <span class="record-priority-pin ${cfg.cls}">${s.priority}</span>
        ${s.photos.length > 1 ? `<span class="record-photo-count">📷 ${s.photos.length}</span>` : ''}
       </div>`
    : `<div class="record-card-img">
        <div class="record-card-no-img">${CAT_EMOJI[s.category] || '📋'}</div>
        <span class="record-priority-pin ${cfg.cls}">${s.priority}</span>
       </div>`;

  const coordRow = (s.lat && s.lng)
    ? `<div class="record-coords">📍 ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</div>`
    : `<div class="record-coords" style="color:var(--text3)">📍 No GPS data</div>`;

  return `<div class="record-card" onclick="showDetail('${s.id}')">
    ${imgSection}
    <div class="record-body">
      <div class="record-title" title="${s.title}">${s.title}</div>
      <div class="record-cat">${CAT_EMOJI[s.category] || ''} ${s.category} · ${s.condition}</div>
      ${coordRow}
      <div class="record-meta-row">
        <span>${formatDate(s.ts)}</span>
        <span class="record-dot"></span>
        <span>${formatTime(s.ts)}</span>
        <span class="record-dot"></span>
        <span>${s.surveyorName || 'Unknown'}</span>
      </div>
      <div class="record-footer" onclick="event.stopPropagation()">
        <button class="record-btn" onclick="showDetail('${s.id}')">👁 View</button>
        <button class="record-btn" onclick="viewOnMap('${s.id}')">🗺 Map</button>
        <button class="record-btn del" onclick="deleteRecord('${s.id}')">🗑 Delete</button>
      </div>
    </div>
  </div>`;
}

function viewOnMap(id) {
  const s = STATE.surveys.find(x => x.id === id);
  if (!s || !s.lat) { showToast('warning', 'No GPS Data', 'This survey has no location data.'); return; }
  navigateTo('map');
  setTimeout(() => {
    if (STATE.mainMap) {
      STATE.mainMap.setView([s.lat, s.lng], 16);
    }
  }, 300);
}

function deleteRecord(id) {
  const s = STATE.surveys.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`Delete survey "${s.title}"? This cannot be undone.`)) return;
  STATE.surveys = STATE.surveys.filter(x => x.id !== id);
  saveToStorage();
  renderRecords();
  renderDashboard();
  showToast('info', 'Record Deleted', `"${s.title}" has been removed.`);
}

// ═══════════════════════════════════════════
//  SURVEY DETAIL MODAL
// ═══════════════════════════════════════════

let detailMapInstance = null;

function showDetail(id) {
  const s = STATE.surveys.find(x => x.id === id);
  if (!s) return;

  document.getElementById('detailModalTitle').textContent = s.title;

  const photosHtml = s.photos.length > 0
    ? `<div class="detail-photos">${s.photos.map(p =>
        `<div class="detail-photo" onclick="openPhotoFullscreen('${p.dataUrl}', '${(p.lat || '').toString().slice(0,10)}, ${(p.lng || '').toString().slice(0,10)}  ·  ${new Date(p.ts).toLocaleString('en-IN')}')">
          <img src="${p.dataUrl}" alt="photo" loading="lazy"/>
         </div>`).join('')}
       </div>`
    : `<div style="background:var(--bg2);border-radius:var(--radius);padding:20px;text-align:center;color:var(--text3);margin-bottom:16px">📷 No photos captured</div>`;

  const customHtml = s.customData && Object.keys(s.customData).length > 0
    ? `<div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:8px">Custom Field Data</div>
        <div class="detail-info-grid">
          ${Object.entries(s.customData).map(([k, v]) =>
            `<div class="detail-field">
              <div class="detail-field-label">${k}</div>
              <div class="detail-field-value">${v === true ? '✅ Yes' : v === false ? '❌ No' : v || '—'}</div>
            </div>`).join('')}
        </div>
      </div>`
    : '';

  document.getElementById('detailModalBody').innerHTML = `
    ${photosHtml}
    <div class="detail-info-grid" style="margin-bottom:16px">
      <div class="detail-field">
        <div class="detail-field-label">Category</div>
        <div class="detail-field-value">${CAT_EMOJI[s.category] || ''} ${s.category}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">Priority</div>
        <div class="detail-field-value">${PRIORITY_CONFIG[s.priority]?.label || s.priority}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">Condition</div>
        <div class="detail-field-value">${s.condition}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">Surveyor</div>
        <div class="detail-field-value">${s.surveyorName || '—'}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">Site Name</div>
        <div class="detail-field-value">${s.siteName || '—'}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">Estimated Cost</div>
        <div class="detail-field-value">${s.estimatedCost ? '₹' + s.estimatedCost.toLocaleString('en-IN') : '—'}</div>
      </div>
      <div class="detail-field" style="grid-column:span 2">
        <div class="detail-field-label">GPS Coordinates</div>
        <div class="detail-field-value" style="font-family:var(--mono);font-size:12px">
          ${s.lat ? `${s.lat.toFixed(7)}, ${s.lng.toFixed(7)}  ±${s.acc ? Math.round(s.acc) : '?'}m` : 'No GPS data'}
        </div>
      </div>
      <div class="detail-field" style="grid-column:span 2">
        <div class="detail-field-label">Address</div>
        <div class="detail-field-value" style="font-size:12px">${s.address || '—'}</div>
      </div>
      ${s.description ? `<div class="detail-field" style="grid-column:span 2">
        <div class="detail-field-label">Description / Observations</div>
        <div class="detail-field-value" style="font-size:13px;font-weight:400;line-height:1.6">${s.description}</div>
      </div>` : ''}
      <div class="detail-field">
        <div class="detail-field-label">Survey ID</div>
        <div class="detail-field-value" style="font-family:var(--mono)">${s.id}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field-label">Date & Time</div>
        <div class="detail-field-value">${formatDateTime(s.ts)}</div>
      </div>
    </div>
    ${customHtml}
    ${s.lat ? `<div id="detailMapContainer" class="detail-map"></div>` : ''}
  `;

  document.getElementById('detailModal').classList.add('open');

  // Render detail map
  if (s.lat) {
    setTimeout(() => {
      const el = document.getElementById('detailMapContainer');
      if (!el) return;
      const dmap = L.map(el, { zoomControl: true, attributionControl: false }).setView([s.lat, s.lng], 15);
      L.tileLayer(MAP_TILE, { attribution: MAP_ATTR }).addTo(dmap);
      L.marker([s.lat, s.lng]).addTo(dmap).bindPopup(s.title).openPopup();
    }, 200);
  }
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('open');
}

function openPhotoFullscreen(src, info) {
  document.getElementById('photoModalImg').src = src;
  document.getElementById('photoModalInfo').textContent = `📍 ${info}`;
  document.getElementById('photoModal').classList.add('open');
}

// ═══════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════

function renderAnalytics() {
  drawActivityChart();
  drawPieChart();
  drawPriorityChart();
  renderConditionBars();
  renderMetrics();
}

function drawActivityChart() {
  const canvas = document.getElementById('activityChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const padL = 40, padR = 20, padT = 16, padB = 30;
  const cW = W - padL - padR, cH = H - padT - padB;

  // Build last 30 days
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const counts = days.map(d => {
    return STATE.surveys.filter(s => {
      const sd = new Date(s.ts);
      return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
    }).length;
  });

  const maxVal = Math.max(...counts, 1);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#4d6357' : '#9ca3af';

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padT + (cH / 4) * i;
    ctx.beginPath(); ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    ctx.moveTo(padL, y); ctx.lineTo(padL + cW, y); ctx.stroke();
    ctx.fillStyle = textColor; ctx.font = '10px Inter'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * (1 - i / 4)), padL - 5, y + 4);
  }

  const pts = counts.map((v, i) => ({
    x: padL + (i / (days.length - 1)) * cW,
    y: padT + (1 - v / maxVal) * cH,
  }));

  // Area
  const grad = ctx.createLinearGradient(0, padT, 0, padT + cH);
  grad.addColorStop(0, 'rgba(249,115,22,0.3)');
  grad.addColorStop(1, 'rgba(249,115,22,0.01)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, padT + cH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, padT + cH);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else {
      const cp = { x: (pts[i - 1].x + p.x) / 2, y: (pts[i - 1].y + p.y) / 2 };
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, cp.x, cp.y);
    }
  });
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();

  // X labels (every 5 days)
  days.forEach((d, i) => {
    if (i % 5 === 0 || i === days.length - 1) {
      ctx.fillStyle = textColor; ctx.font = '9px Inter'; ctx.textAlign = 'center';
      ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, pts[i].x, padT + cH + 16);
    }
  });
}

function drawPieChart() {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const counts = {};
  STATE.surveys.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
  const entries = Object.entries(counts);
  const total = entries.reduce((a, b) => a + b[1], 0);

  if (total === 0) {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#4d6357' : '#9ca3af';
    ctx.font = '13px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('No data yet', W / 2, H / 2);
    return;
  }

  const cx = W / 2, cy = H / 2 - 10, r = 80;
  let startAngle = -Math.PI / 2;
  entries.forEach(([cat, count]) => {
    const slice = (count / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = CAT_COLORS[cat] || '#6b7280';
    ctx.fill(); ctx.strokeStyle = 'var(--bg1)'; ctx.lineWidth = 2; ctx.stroke();
    startAngle += slice;
  });

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? '#111814' : '#ffffff'; ctx.fill();

  const legend = document.getElementById('pieChartLegend');
  if (legend) {
    legend.innerHTML = entries.map(([cat, count]) => `
      <div class="pie-legend-item">
        <span class="pie-legend-dot" style="background:${CAT_COLORS[cat] || '#6b7280'}"></span>
        ${cat} (${count})
      </div>`).join('');
  }
}

function drawPriorityChart() {
  const canvas = document.getElementById('priorityChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const priorities = [
    { label: 'Normal', color: '#22c55e' },
    { label: 'High',   color: '#f59e0b' },
    { label: 'Urgent', color: '#ef4444' },
  ];

  const counts = priorities.map(p => STATE.surveys.filter(s => s.priority === p.label).length);
  const maxVal = Math.max(...counts, 1);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#8aa090' : '#3a5043';

  const barW = 50, gap = (W - priorities.length * barW) / (priorities.length + 1);
  const padT = 20, padB = 50;
  const chartH = H - padT - padB;

  priorities.forEach((p, i) => {
    const x = gap + i * (barW + gap);
    const h = (counts[i] / maxVal) * chartH;
    const y = padT + chartH - h;

    const grad = ctx.createLinearGradient(0, y, 0, padT + chartH);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, p.color + '44');

    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, h, [6, 6, 0, 0]) : ctx.rect(x, y, barW, h);
    ctx.fillStyle = grad; ctx.fill();

    ctx.fillStyle = textColor; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
    ctx.fillText(counts[i], x + barW / 2, y - 8);
    ctx.font = '11px Inter';
    ctx.fillText(p.label, x + barW / 2, padT + chartH + 18);
  });
}

function renderConditionBars() {
  const container = document.getElementById('conditionBars');
  if (!container) return;

  const conditions = [
    { label: 'Good',     color: '#22c55e' },
    { label: 'Fair',     color: '#f59e0b' },
    { label: 'Poor',     color: '#f97316' },
    { label: 'Critical', color: '#ef4444' },
  ];

  const total = Math.max(STATE.surveys.length, 1);
  container.innerHTML = conditions.map(c => {
    const count = STATE.surveys.filter(s => s.condition === c.label).length;
    const pct = Math.round((count / total) * 100);
    return `<div class="cond-row">
      <span class="cond-label">${c.label}</span>
      <div class="cond-bar-track"><div class="cond-bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
      <span class="cond-count">${count}</span>
    </div>`;
  }).join('');
}

function renderMetrics() {
  const list = document.getElementById('metricsList');
  if (!list) return;

  const total = STATE.surveys.length;
  const withGPS = STATE.surveys.filter(s => s.lat && s.lng).length;
  const withPhotos = STATE.surveys.filter(s => s.photos.length > 0).length;
  const totalPhotos = STATE.surveys.reduce((a, s) => a + s.photos.length, 0);
  const todayCount = STATE.surveys.filter(s => isToday(s.ts)).length;
  const urgentCount = STATE.surveys.filter(s => s.priority === 'Urgent').length;

  const rows = [
    ['Total Surveys', total],
    ['GPS Tagged', `${withGPS} (${total ? Math.round(withGPS/total*100) : 0}%)`],
    ['With Photos', `${withPhotos} (${total ? Math.round(withPhotos/total*100) : 0}%)`],
    ['Total Photos', totalPhotos],
    ['Today\'s Surveys', todayCount],
    ['Urgent Priority', urgentCount],
  ];

  list.innerHTML = rows.map(([label, val]) => `
    <div class="metric-row">
      <span>${label}</span>
      <strong>${val}</strong>
    </div>`).join('');
}

// ═══════════════════════════════════════════
//  EXPORT CSV
// ═══════════════════════════════════════════

function exportCSV() {
  if (STATE.surveys.length === 0) {
    showToast('warning', 'No Data', 'There are no surveys to export.');
    return;
  }

  const headers = ['ID', 'Title', 'Category', 'Priority', 'Condition', 'Site Name', 'Surveyor',
    'Latitude', 'Longitude', 'Accuracy (m)', 'Address', 'Description', 'Estimated Cost (INR)',
    'Photos Count', 'Date', 'Time'];

  const rows = STATE.surveys.map(s => [
    s.id, `"${s.title}"`, s.category, s.priority, s.condition,
    `"${s.siteName || ''}"`, s.surveyorName,
    s.lat?.toFixed(7) ?? '', s.lng?.toFixed(7) ?? '',
    s.acc ? Math.round(s.acc) : '',
    `"${s.address || ''}"`, `"${s.description || ''}"`,
    s.estimatedCost ?? '',
    s.photos.length, formatDate(s.ts), formatTime(s.ts),
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `geosurvey_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'CSV Exported!', `${STATE.surveys.length} records exported successfully.`);
}

// ═══════════════════════════════════════════
//  SETTINGS HELPERS
// ═══════════════════════════════════════════

function updateStorageInfo() {
  const el = document.getElementById('storageUsed');
  if (!el) return;
  try {
    const used = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
    const usedKB = (used / 1024).toFixed(1);
    el.textContent = `${usedKB} KB used · ${STATE.surveys.length} records stored locally`;
  } catch (_) {
    el.textContent = 'Storage info unavailable';
  }
}

function showStorageInfo() {
  updateStorageInfo();
  showToast('info', 'Local Storage', `${STATE.surveys.length} surveys stored. Data is saved in your browser.`);
}

function exportAllData() {
  const data = JSON.stringify(STATE.surveys, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `geosurvey_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Backup Exported', 'All survey data saved as JSON.');
}

function confirmClearData() {
  if (STATE.surveys.length === 0) { showToast('info', 'Nothing to clear', ''); return; }
  if (!confirm(`⚠️ This will permanently delete all ${STATE.surveys.length} survey records. This cannot be undone.\n\nAre you sure?`)) return;
  STATE.surveys = [];
  saveToStorage();
  renderDashboard();
  renderRecords();
  showToast('info', 'All Records Cleared', 'Your survey data has been deleted.');
}

// ═══════════════════════════════════════════
//  CLOCK
// ═══════════════════════════════════════════

function updateClock() {
  const el = document.getElementById('currentTime');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function updateVFClock() {
  const el = document.getElementById('vfTime');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ═══════════════════════════════════════════
//  SEED DEMO DATA (first run)
// ═══════════════════════════════════════════

function seedDemoData() {
  if (STATE.surveys.length > 0) return;

  const demos = [
    {
      title: 'NH-48 Road Surface Damage',
      category: 'Road', priority: 'Urgent', condition: 'Critical',
      lat: 21.1458, lng: 79.0882, description: 'Multiple potholes observed over 500m stretch. Requires immediate patching.',
      address: 'NH-48, Near Nagpur Junction, Maharashtra',
      surveyorName: 'Prasad Gawade', siteName: 'Highway NH-48 KM 42',
      estimatedCost: 250000,
    },
    {
      title: 'Drainage Blockage Survey',
      category: 'Water', priority: 'High', condition: 'Poor',
      lat: 21.1534, lng: 79.0789, description: 'Storm drain blocked with debris. Flooding risk during monsoon.',
      address: 'Dharampeth, Nagpur, Maharashtra',
      surveyorName: 'Prasad Gawade', siteName: 'Dharampeth Nala Bridge',
      estimatedCost: 45000,
    },
    {
      title: 'Agricultural Land Assessment',
      category: 'Agriculture', priority: 'Normal', condition: 'Good',
      lat: 21.1380, lng: 79.0994, description: 'Fertile black soil land. Suitable for soybean and cotton cultivation.',
      address: 'Hingna, Nagpur District, Maharashtra',
      surveyorName: 'Prasad Gawade', siteName: 'Survey No. 142, Hingna Village',
      estimatedCost: null,
    },
    {
      title: 'School Building Inspection',
      category: 'Education', priority: 'High', condition: 'Fair',
      lat: 21.1612, lng: 79.1023, description: 'Roof leakage reported in 3 classrooms. Plaster damage visible on north wall.',
      address: 'Sadar, Nagpur, Maharashtra',
      surveyorName: 'Prasad Gawade', siteName: 'ZP Primary School, Sadar',
      estimatedCost: 80000,
    },
    {
      title: 'Forest Cover Monitoring',
      category: 'Environment', priority: 'Normal', condition: 'Good',
      lat: 21.1290, lng: 79.0712, description: 'Dense teak plantation. Approximately 85% canopy cover. No illegal logging observed.',
      address: 'Ambazari, Nagpur, Maharashtra',
      surveyorName: 'Prasad Gawade', siteName: 'Ambazari Forest Block 7',
      estimatedCost: null,
    },
  ];

  const baseTs = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
  demos.forEach((d, i) => {
    STATE.surveys.push({
      id: uuid(),
      seqId: i + 1,
      ...d,
      acc: 12 + Math.random() * 8,
      photos: [],
      customFields: [],
      customData: {},
      ts: baseTs + i * (6 * 60 * 60 * 1000) + Math.random() * 3600000,
      synced: false,
    });
  });

  saveToStorage();
}

// ═══════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════

window.addEventListener('load', () => {
  initSplash();
});

// Called after splash
function initApp() {
  loadFromStorage();
  seedDemoData();

  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  document.getElementById('newSurveyTopBtn').addEventListener('click', () => navigateTo('capture'));
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Theme
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
    document.getElementById('themeBtn').textContent = e.target.checked ? '🌙' : '☀️';
  });
  document.getElementById('watermarkToggle').addEventListener('change', (e) => {
    STATE.watermarkEnabled = e.target.checked;
  });

  document.getElementById('syncBtn').addEventListener('click', () => {
    showToast('info', 'All Synced ✅', 'Records are saved locally. Cloud sync is enabled in the Pro plan.');
  });

  // Camera
  document.getElementById('startCamBtn').addEventListener('click', startCamera);
  document.getElementById('shutterBtn').addEventListener('click', capturePhoto);
  document.getElementById('switchCamBtn').addEventListener('click', switchCamera);
  document.getElementById('torchBtn').addEventListener('click', toggleTorch);
  document.getElementById('clearPhotosBtn').addEventListener('click', clearPhotos);

  // Form
  document.getElementById('submitSurveyBtn').addEventListener('click', submitSurvey);
  document.getElementById('addFieldBtn').addEventListener('click', openFieldModal);
  document.getElementById('gpsRefreshBtn').addEventListener('click', captureGPS);
  document.getElementById('surveyCategory').addEventListener('change', (e) => {
    const vf = document.getElementById('vfCatLabel');
    vf.textContent = e.target.value ? (CAT_EMOJI[e.target.value] + ' ' + e.target.value) : '— Select Category —';
  });

  // Records
  document.getElementById('searchInput').addEventListener('input', renderRecords);
  document.getElementById('filterCat').addEventListener('change', renderRecords);
  document.getElementById('filterPriority').addEventListener('change', renderRecords);
  document.getElementById('filterSort').addEventListener('change', renderRecords);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  // Custom field modal
  document.getElementById('fieldType').addEventListener('change', (e) => {
    document.getElementById('fieldOptionsGroup').style.display = e.target.value === 'select' ? 'block' : 'none';
  });

  // Modals close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  });

  // Settings
  document.getElementById('settingName').addEventListener('change', (e) => {
    document.querySelector('.user-name').textContent = e.target.value;
    document.getElementById('surveyorName').value = e.target.value;
  });

  // Start GPS
  startGPS();

  // Dashboard
  renderDashboard();
  initDashMiniMap();
  updateClock();
  setInterval(updateClock, 1000);
  updateVFClock();
  setInterval(updateVFClock, 1000);

  // Survey ID
  updateSurveyIdBadge();

  // Storage info
  updateStorageInfo();

  // Nav badges
  document.getElementById('recordCount').textContent = STATE.surveys.length;
}
