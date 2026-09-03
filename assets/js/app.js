(() => {
  const mapElement = document.querySelector('#leaflet-map');
  const locationStatus = document.querySelector('#location-status');
  const locateButton = document.querySelector('#locate-button');
  const headingButton = document.querySelector('#heading-button');
  const headingStatus = document.querySelector('#heading-status');
  const timeline = document.querySelector('#timeline');
  const analysisTime = document.querySelector('#analysis-time');
  const rainStatus = document.querySelector('#rain-status');
  const playButton = document.querySelector('#play-button');

  if (!mapElement || !locationStatus || !locateButton || typeof window.L === 'undefined') {
    if (locationStatus) locationStatus.textContent = '地図を読み込めませんでした。通信環境を確認してください';
    if (rainStatus) rainStatus.textContent = '雨雲データを表示できません';
    return;
  }

  const rotationAvailable = typeof L.Map?.prototype?.setBearing === 'function';

  const map = L.map(mapElement, {
    center: [36.2048, 138.2529],
    zoom: 5,
    zoomControl: true,
    touchZoom: true,
    dragging: true,
    tap: false,
    rotate: rotationAvailable,
    bearing: 0,
    dragRotate: false,
    shiftKeyRotate: false,
    touchRotate: false,
    rotateControl: false,
    preventPageGestures: true
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  map.createPane('rainPane');
  const rainPane = map.getPane('rainPane');
  rainPane.style.zIndex = '350';
  rainPane.style.pointerEvents = 'none';

  const markerIcon = L.divIcon({
    className: 'ride-location-marker',
    html: '<b class="marker-heading-arrow"></b><span><i></i></span>',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  let currentMarker = null;
  let accuracyCircle = null;
  let latestHeading = null;
  let headingUp = false;

  const applyHeading = () => {
    const markerElement = currentMarker?.getElement();
    if (!markerElement || latestHeading === null) return;
    const arrowHeading = headingUp ? 0 : latestHeading;
    markerElement.style.setProperty('--heading', `${arrowHeading}deg`);
    markerElement.classList.add('has-heading');
  };

  const showPosition = ({ coords }) => {
    const position = [coords.latitude, coords.longitude];
    if (!currentMarker) {
      currentMarker = L.marker(position, {
        icon: markerIcon,
        keyboard: false,
        title: '現在地',
        zIndexOffset: 1000
      }).addTo(map).bindPopup('現在地');
    } else {
      currentMarker.setLatLng(position);
    }

    if (accuracyCircle) accuracyCircle.remove();
    accuracyCircle = L.circle(position, {
      radius: Math.max(coords.accuracy, 10),
      color: '#ee7b32',
      weight: 1,
      fillColor: '#ee7b32',
      fillOpacity: 0.12,
      interactive: false
    }).addTo(map);

    map.setView(position, 16, { animate: true });
    applyHeading();
    locationStatus.textContent = `現在地を表示中（精度 約${Math.round(coords.accuracy)}m）`;
    locateButton.classList.remove('is-loading');
  };

  const showLocationError = (error) => {
    locateButton.classList.remove('is-loading');
    if (!window.isSecureContext) {
      locationStatus.textContent = '位置情報の利用にはHTTPS接続が必要です';
    } else if (error?.code === 1) {
      locationStatus.textContent = '位置情報を許可すると現在地を表示できます';
    } else if (error?.code === 3) {
      locationStatus.textContent = '現在地を取得できませんでした。もう一度お試しください';
    } else {
      locationStatus.textContent = '位置情報を利用できません。端末の設定を確認してください';
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      showLocationError();
      return;
    }
    locateButton.classList.add('is-loading');
    locationStatus.textContent = '現在地を取得しています…';
    navigator.geolocation.getCurrentPosition(showPosition, showLocationError, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000
    });
  };

  locateButton.addEventListener('click', requestLocation);
  L.DomEvent.disableClickPropagation(locateButton.parentElement);
  requestAnimationFrame(() => map.invalidateSize());
  requestLocation();

  if (headingButton && headingStatus) {
    let orientationListening = false;
    let orientationReceived = false;
    let orientationTimeout = null;
    const compassIcon = headingButton.querySelector('.compass-icon');
    const modeLabel = headingButton.querySelector('small');

    const updateHeadingModeUI = () => {
      headingButton.classList.toggle('is-active', headingUp);
      headingButton.classList.toggle('is-heading-up', headingUp);
      headingButton.setAttribute('aria-pressed', headingUp ? 'true' : 'false');
      headingButton.setAttribute('aria-label', headingUp ? 'ノースアップへ切り替え' : 'ヘディングアップへ切り替え');
      if (compassIcon) compassIcon.textContent = headingUp ? '↑' : 'N';
      if (modeLabel) modeLabel.textContent = headingUp ? '進行方向' : '北固定';
    };

    const screenAngle = () => {
      const angle = window.screen?.orientation?.angle;
      if (Number.isFinite(angle)) return angle;
      return Number.isFinite(window.orientation) ? Number(window.orientation) : 0;
    };

    const handleOrientation = (event) => {
      let heading = null;
      if (Number.isFinite(event.webkitCompassHeading)) {
        heading = event.webkitCompassHeading;
      } else if (Number.isFinite(event.alpha)) {
        heading = 360 - event.alpha + screenAngle();
      }
      if (heading === null) return;

      latestHeading = (heading + 360) % 360;
      orientationReceived = true;
      window.clearTimeout(orientationTimeout);
      applyHeading();

      if (headingUp) {
        map.setHeading(latestHeading, { ease: 0.18, deadzone: 1 });
        headingStatus.textContent = `ヘディングアップ（${Math.round(latestHeading)}°）`;
      } else {
        headingStatus.textContent = `ノースアップ（進行方向 ${Math.round(latestHeading)}°）`;
      }
    };

    const startOrientation = () => {
      if (!orientationListening) {
        window.addEventListener('deviceorientation', handleOrientation, true);
        orientationListening = true;
      }
      orientationReceived = false;
      headingStatus.textContent = '進行方向を取得しています…';
      window.clearTimeout(orientationTimeout);
      orientationTimeout = window.setTimeout(() => {
        if (!orientationReceived) {
          headingStatus.textContent = '方位を取得できません。端末のセンサー設定を確認してください';
        }
      }, 5000);
    };

    const enableHeadingUp = async () => {
      if (!window.isSecureContext) {
        headingStatus.textContent = '進行方向の利用にはHTTPS接続が必要です';
        return;
      }
      if (!rotationAvailable || typeof map.setHeading !== 'function') {
        headingStatus.textContent = '地図の回転機能を読み込めませんでした。再読み込みしてください';
        return;
      }
      if (typeof window.DeviceOrientationEvent === 'undefined') {
        headingStatus.textContent = 'この端末では進行方向を取得できません';
        return;
      }

      try {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission !== 'granted') {
            headingStatus.textContent = 'センサーを許可するとヘディングアップを利用できます';
            return;
          }
        }

        headingUp = true;
        updateHeadingModeUI();
        startOrientation();
        if (latestHeading !== null) {
          map.setHeading(latestHeading, { ease: 0.18, deadzone: 1 });
          applyHeading();
        }
      } catch {
        headingStatus.textContent = 'センサーを許可するとヘディングアップを利用できます';
      }
    };

    const disableHeadingUp = () => {
      headingUp = false;
      window.clearTimeout(orientationTimeout);
      if (typeof map.stopHeadingUp === 'function') map.stopHeadingUp();
      if (typeof map.setBearing === 'function') map.setBearing(0);
      applyHeading();
      updateHeadingModeUI();
      headingStatus.textContent = latestHeading === null
        ? 'ノースアップ（北を上に表示）'
        : `ノースアップ（進行方向 ${Math.round(latestHeading)}°）`;
    };

    headingButton.addEventListener('click', () => {
      if (headingUp) disableHeadingUp();
      else enableHeadingUp();
    });

    updateHeadingModeUI();
    headingStatus.textContent = 'ノースアップ（北を上に表示）';
  }

  if (!timeline || !analysisTime || !rainStatus || !playButton || typeof window.JmaRainProvider === 'undefined') {
    if (rainStatus) rainStatus.textContent = '雨雲データを表示できません';
    return;
  }

  const provider = new JmaRainProvider();
  const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const kindLabels = {
    observed: '観測',
    analysis: '最新解析',
    forecast: '予測'
  };

  let frames = [];
  let activeIndex = -1;
  let currentRainLayer = null;
  let preloadLayer = null;
  let pendingLayer = null;
  let switchToken = 0;
  let playing = false;
  let playbackTimer = null;
  let refreshPromise = null;

  const createRainLayer = (frame) => {
    const layer = L.tileLayer(provider.getTileUrl(frame), {
      pane: 'rainPane',
      opacity: 0,
      maxNativeZoom: 10,
      maxZoom: 19,
      keepBuffer: 1,
      updateWhenIdle: true,
      updateWhenZooming: false
    });
    layer._rideFrameId = frame.id;
    layer._rideLoaded = false;
    layer._rideSuccessfulTiles = 0;
    layer.on('tileload', () => {
      layer._rideSuccessfulTiles += 1;
    });
    layer.on('load', () => {
      layer._rideLoaded = true;
    });
    return layer;
  };

  const waitForLayer = (layer) => {
    if (layer._rideLoaded) return Promise.resolve(layer._rideSuccessfulTiles > 0);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (success) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        layer.off('load', loaded);
        resolve(success);
      };
      const loaded = () => finish(layer._rideSuccessfulTiles > 0);
      const timeout = window.setTimeout(() => finish(false), 8000);
      layer.once('load', loaded);
    });
  };

  const updateTimelineSelection = () => {
    [...timeline.children].forEach((item, index) => {
      item.classList.toggle('active', index === activeIndex);
      item.setAttribute('aria-pressed', index === activeIndex ? 'true' : 'false');
    });
  };

  const preloadNextFrame = (index) => {
    if (index < 0 || index >= frames.length || playing === false && document.hidden) return;
    if (preloadLayer) {
      map.removeLayer(preloadLayer);
      preloadLayer = null;
    }
    const layer = createRainLayer(frames[index]);
    preloadLayer = layer;
    layer.addTo(map);
    waitForLayer(layer).then((success) => {
      if (!success && preloadLayer === layer) {
        map.removeLayer(layer);
        preloadLayer = null;
      }
    });
  };

  const showFrame = async (index, { preload = true } = {}) => {
    if (index < 0 || index >= frames.length) return false;
    const token = ++switchToken;
    const frame = frames[index];

    if (pendingLayer && pendingLayer !== currentRainLayer && pendingLayer !== preloadLayer) {
      map.removeLayer(pendingLayer);
    }

    let nextLayer;
    if (preloadLayer?._rideFrameId === frame.id) {
      nextLayer = preloadLayer;
      preloadLayer = null;
    } else {
      if (preloadLayer) map.removeLayer(preloadLayer);
      preloadLayer = null;
      nextLayer = createRainLayer(frame);
      nextLayer.addTo(map);
    }
    pendingLayer = nextLayer;

    const success = await waitForLayer(nextLayer);
    if (token !== switchToken) {
      if (nextLayer !== currentRainLayer && nextLayer !== preloadLayer && map.hasLayer(nextLayer)) {
        map.removeLayer(nextLayer);
      }
      return false;
    }
    pendingLayer = null;

    if (!success) {
      if (map.hasLayer(nextLayer)) map.removeLayer(nextLayer);
      rainStatus.textContent = '雨雲データを取得できません。地図はそのまま利用できます';
      return false;
    }

    const oldLayer = currentRainLayer;
    currentRainLayer = nextLayer;
    nextLayer.setOpacity(0.72);
    if (oldLayer && oldLayer !== nextLayer) {
      window.setTimeout(() => {
        if (oldLayer !== currentRainLayer && map.hasLayer(oldLayer)) map.removeLayer(oldLayer);
      }, 120);
    }

    activeIndex = index;
    updateTimelineSelection();
    const label = kindLabels[frame.kind];
    rainStatus.textContent = `${label} ${timeFormatter.format(frame.date)} を表示中`;
    //timeline.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    if (preload && index + 1 < frames.length) {
      window.setTimeout(() => preloadNextFrame(index + 1), 100);
    }
    return true;
  };

  const renderTimeline = () => {
    timeline.replaceChildren();
    frames.forEach((frame, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `time-item ${frame.kind}`;
      if (frame.kind === 'analysis') item.classList.add('current');
      item.setAttribute('aria-pressed', 'false');
      item.setAttribute('aria-label', `${kindLabels[frame.kind]} ${timeFormatter.format(frame.date)}`);

      const kind = document.createElement('small');
      kind.textContent = kindLabels[frame.kind];
      const time = document.createElement('strong');
      time.textContent = timeFormatter.format(frame.date);
      item.append(kind, time);

      item.addEventListener('click', () => {
        stopPlayback();
        showFrame(index);
      });
      timeline.append(item);
    });
  };

  const stopPlayback = () => {
    playing = false;
    window.clearTimeout(playbackTimer);
    playbackTimer = null;
    playButton.classList.remove('playing');
    playButton.setAttribute('aria-pressed', 'false');
    playButton.setAttribute('aria-label', '雨雲タイムラインを再生');
  };

  const startPlayback = () => {
    if (!frames.length) return;
    playing = true;
    playButton.classList.add('playing');
    playButton.setAttribute('aria-pressed', 'true');
    playButton.setAttribute('aria-label', '雨雲タイムラインを停止');
    let playbackIndex = 0;

    const step = async () => {
      if (!playing) return;
      await showFrame(playbackIndex);
      if (!playing) return;
      playbackIndex += 1;
      if (playbackIndex >= frames.length) {
        stopPlayback();
        return;
      }
      playbackTimer = window.setTimeout(step, 700);
    };
    step();
  };

  playButton.addEventListener('click', () => {
    if (playing) stopPlayback();
    else startPlayback();
  });

  const refreshRainFrames = async () => {
    if (refreshPromise || playing) return refreshPromise;
    refreshPromise = (async () => {
      rainStatus.textContent = '最新の雨雲を確認しています…';
      try {
        const result = await provider.getFrames();
        const nextFrames = result.frames;
        const nextAnalysis = nextFrames.find((frame) => frame.kind === 'analysis');
        const currentAnalysis = frames.find((frame) => frame.kind === 'analysis');

        if (currentAnalysis?.id === nextAnalysis?.id && frames.length) {
          rainStatus.textContent = `最新解析 ${timeFormatter.format(nextAnalysis.date)}`;
          return;
        }

        stopPlayback();
        frames = nextFrames;
        analysisTime.textContent = timeFormatter.format(result.baseDate);
        renderTimeline();
        const analysisIndex = frames.findIndex((frame) => frame.kind === 'analysis');
        const shown = await showFrame(analysisIndex);
        if (!shown) {
          rainStatus.textContent = '雨雲データを取得できません。時間をおいて更新してください';
        }
      } catch {
        rainStatus.textContent = '雨雲データを取得できません。地図はそのまま利用できます';
      }
    })().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  };

  refreshRainFrames();
  window.setInterval(refreshRainFrames, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshRainFrames();
  });
})();
