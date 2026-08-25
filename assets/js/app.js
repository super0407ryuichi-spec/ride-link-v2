(() => {
  const mapElement = document.querySelector('#leaflet-map');
  const locationStatus = document.querySelector('#location-status');
  const locateButton = document.querySelector('#locate-button');

  if (mapElement && locationStatus && locateButton) {
    if (typeof window.L === 'undefined') {
      locationStatus.textContent = '地図を読み込めませんでした。通信環境を確認してください';
    } else {
      const map = L.map(mapElement, {
        center: [36.2048, 138.2529],
        zoom: 5,
        zoomControl: true,
        touchZoom: true,
        dragging: true,
        tap: false
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const markerIcon = L.divIcon({
        className: 'ride-location-marker',
        html: '<span><i></i></span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      let currentMarker = null;
      let accuracyCircle = null;

      const showPosition = ({ coords }) => {
        const position = [coords.latitude, coords.longitude];
        if (!currentMarker) {
          currentMarker = L.marker(position, {
            icon: markerIcon,
            keyboard: false,
            title: '現在地'
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
    }
  }

  const timeline = document.querySelector('#timeline');
  const timeDisplay = document.querySelector('#current-time');
  const playButton = document.querySelector('#play-button');
  if (!timeline || !timeDisplay || !playButton) return;

  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
  const formatter = new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
  timeDisplay.textContent = formatter.format(now);

  for (let offset = -60; offset <= 60; offset += 5) {
    const time = new Date(now.getTime() + offset * 60_000);
    const item = document.createElement('span');
    item.className = `time-item${offset === 0 ? ' current' : ''}`;
    item.dataset.offset = String(offset);
    item.textContent = formatter.format(time);
    item.setAttribute('aria-label', offset === 0 ? `${item.textContent} 現在` : `${item.textContent} ${offset < 0 ? `${Math.abs(offset)}分前` : `${offset}分後`}`);
    timeline.append(item);
  }

  const current = timeline.querySelector('.current');
  requestAnimationFrame(() => current?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  let timer = null;
  let activeIndex = 0;
  const items = [...timeline.children];
  const stop = () => {
    window.clearInterval(timer);
    timer = null;
    playButton.classList.remove('playing');
    playButton.setAttribute('aria-pressed', 'false');
    playButton.setAttribute('aria-label', 'タイムラインを再生');
  };
  playButton.addEventListener('click', () => {
    if (timer) { stop(); return; }
    playButton.classList.add('playing');
    playButton.setAttribute('aria-pressed', 'true');
    playButton.setAttribute('aria-label', 'タイムラインを停止');
    activeIndex = Math.max(0, items.findIndex((item) => item.classList.contains('current')));
    timer = window.setInterval(() => {
      items[activeIndex]?.classList.remove('current');
      activeIndex += 1;
      if (activeIndex >= items.length) { activeIndex = 0; stop(); }
      items[activeIndex]?.classList.add('current');
      items[activeIndex]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 700);
  });
})();
