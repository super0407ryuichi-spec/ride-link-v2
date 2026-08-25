(() => {
  const savedView = document.querySelector('#saved-view');
  const backButton = document.querySelector('#saved-back-button');
  const listElement = document.querySelector('#saved-tour-list');
  const emptyState = document.querySelector('#saved-empty-state');
  const countElement = document.querySelector('#saved-tour-count');
  const actionStatus = document.querySelector('#saved-action-status');

  if (!savedView || !listElement || !emptyState || !countElement) return;

  const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  let toursById = new Map();
  let statusTimer = null;

  const isSavedView = () => {
    const hash = window.location.hash;
    return hash === '#saved' || hash === '#saved-list';
  };

  const showStatus = (message, type = 'success') => {
    window.clearTimeout(statusTimer);
    actionStatus.textContent = message;
    actionStatus.classList.toggle('error', type === 'error');
    actionStatus.hidden = false;
    statusTimer = window.setTimeout(() => {
      actionStatus.hidden = true;
    }, 4000);
  };

  const formatSavedDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '日付不明' : dateFormatter.format(date);
  };

  const cloneTour = (tour) => ({
    ...tour,
    waypoints: [...tour.waypoints]
  });

  const createRouteSummary = (tour) => {
    const route = document.createElement('div');
    route.className = 'saved-route-summary';

    const origin = document.createElement('div');
    origin.innerHTML = '<span class="saved-route-dot origin"></span><small>出発地点</small>';
    const originValue = document.createElement('strong');
    originValue.textContent = tour.origin;
    origin.append(originValue);

    const connector = document.createElement('span');
    connector.className = 'saved-route-connector';
    connector.setAttribute('aria-hidden', 'true');

    const destination = document.createElement('div');
    destination.innerHTML = '<span class="saved-route-dot destination"></span><small>目的地</small>';
    const destinationValue = document.createElement('strong');
    destinationValue.textContent = tour.destination;
    destination.append(destinationValue);

    route.append(origin, connector, destination);
    return route;
  };

  const createActionButton = (label, action, className = '') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `saved-card-action ${className}`;
    button.dataset.action = action;
    button.textContent = label;
    return button;
  };

  const createTourCard = (tour) => {
    const card = document.createElement('article');
    card.className = 'saved-tour-card';
    card.dataset.tourId = tour.id;

    const header = document.createElement('div');
    header.className = 'saved-card-head';
    const title = document.createElement('h2');
    title.textContent = tour.title || '名称未設定';
    const date = document.createElement('time');
    date.dateTime = tour.createdAt;
    date.textContent = `保存日 ${formatSavedDate(tour.createdAt)}`;
    header.append(title, date);

    const meta = document.createElement('p');
    meta.className = 'saved-card-meta';
    meta.textContent = `経由地点 ${tour.waypoints.length}件`;

    const primaryActions = document.createElement('div');
    primaryActions.className = 'saved-card-primary-actions';
    primaryActions.append(
      createActionButton('開く', 'open', 'open-action'),
      createActionButton('編集', 'edit', 'edit-action')
    );

    const mapsData = window.RideLinkTourLinks.buildGoogleMapsUrl(tour);
    const mapsLink = document.createElement('a');
    mapsLink.className = 'saved-card-action saved-maps-action';
    mapsLink.href = mapsData.url;
    mapsLink.target = '_blank';
    mapsLink.rel = 'noopener';
    mapsLink.textContent = 'Googleマップで開く';

    const secondaryActions = document.createElement('div');
    secondaryActions.className = 'saved-card-secondary-actions';
    secondaryActions.append(
      createActionButton('共有リンクをコピー', 'copy', 'share-action'),
      createActionButton('削除', 'delete', 'delete-action')
    );

    card.append(
      header,
      createRouteSummary(tour),
      meta,
      primaryActions,
      mapsLink,
      secondaryActions
    );
    return card;
  };

  const renderSavedTours = () => {
    if (!isSavedView()) return;

    actionStatus.hidden = true;
    listElement.replaceChildren();

    try {
      const tours = window.RideLinkTourStorage.list();
      toursById = new Map(tours.map((tour) => [tour.id, tour]));
      countElement.textContent = String(tours.length);
      emptyState.hidden = tours.length > 0;

      tours.forEach((tour) => {
        try {
          listElement.append(createTourCard(tour));
        } catch {
          const fallbackCard = document.createElement('article');
          fallbackCard.className = 'saved-tour-card saved-card-error';
          fallbackCard.textContent = 'このツーリングを表示できませんでした';
          listElement.append(fallbackCard);
        }
      });
    } catch {
      toursById = new Map();
      countElement.textContent = '0';
      emptyState.hidden = false;
      showStatus('保存リストを読み込めませんでした。Safariのストレージ設定を確認してください', 'error');
    }
  };

  const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.readOnly = true;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.fontSize = '16px';
    document.body.append(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    textArea.remove();
    return copied;
  };

  const copyTourLink = async (tour) => {
    try {
      const { url } = window.RideLinkTourLinks.buildGoogleMapsUrl(tour);
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (!fallbackCopy(url)) {
        throw new Error('copy-failed');
      }
      showStatus('コピーしました');
    } catch {
      try {
        const { url } = window.RideLinkTourLinks.buildGoogleMapsUrl(tour);
        if (fallbackCopy(url)) {
          showStatus('コピーしました');
          return;
        }
      } catch {
        // Continue to the error message below.
      }
      showStatus('共有リンクをコピーできませんでした', 'error');
    }
  };

  const openTour = (tour) => {
    window.rideLinkRouteDraft = cloneTour(tour);
    window.location.hash = '#confirm';
  };

  const editTour = (tour) => {
    const draft = cloneTour(tour);
    window.rideLinkRouteDraft = draft;
    window.dispatchEvent(new CustomEvent('ride-link:edit-tour', { detail: draft }));
    window.location.hash = '#create';
  };

  const deleteTour = (tour) => {
    const title = tour.title || '名称未設定';
    const confirmed = window.confirm(`「${title}」を削除しますか？\nこの操作は取り消せません。`);
    if (!confirmed) return;

    try {
      window.RideLinkTourStorage.remove(tour.id);
      if (window.rideLinkRouteDraft?.id === tour.id) {
        window.rideLinkRouteDraft = null;
      }
      renderSavedTours();
      showStatus('削除しました');
    } catch {
      showStatus('削除できませんでした', 'error');
    }
  };

  listElement.addEventListener('click', (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;
    const card = actionButton.closest('[data-tour-id]');
    const tour = toursById.get(card?.dataset.tourId);
    if (!tour) {
      showStatus('ツーリングを読み込めませんでした', 'error');
      return;
    }

    const action = actionButton.dataset.action;
    if (action === 'open') openTour(tour);
    else if (action === 'edit') editTour(tour);
    else if (action === 'copy') copyTourLink(tour);
    else if (action === 'delete') deleteTour(tour);
  });

  backButton.addEventListener('click', () => {
    window.location.hash = '';
  });
  window.addEventListener('hashchange', renderSavedTours);
  window.addEventListener('storage', renderSavedTours);

  renderSavedTours();
})();