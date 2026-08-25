(() => {
  const confirmView = document.querySelector('#confirm-view');
  const backButton = document.querySelector('#confirm-back-button');
  const editButton = document.querySelector('#confirm-edit-button');
  const emptyState = document.querySelector('#confirm-empty-state');
  const confirmContent = document.querySelector('#confirm-content');
  const titleElement = document.querySelector('#confirm-tour-title');
  const routeList = document.querySelector('#confirm-route-list');
  const returnNote = document.querySelector('#confirm-return-note');
  const mapsLimitNote = document.querySelector('#maps-limit-note');
  const singleMapActions = document.querySelector('#single-map-actions');
  const mapsButton = document.querySelector('#open-google-maps');
  const copyButton = document.querySelector('#copy-share-link');
  const multiMapActions = document.querySelector('#multi-map-actions');
  const segmentCountMessage = document.querySelector('#segment-count-message');
  const segmentList = document.querySelector('#confirm-segment-list');
  const copyAllButton = document.querySelector('#copy-all-segments');
  const saveButton = document.querySelector('#save-tour-button');
  const actionStatus = document.querySelector('#confirm-action-status');

  if (!confirmView || !routeList || !mapsButton || !copyButton || !saveButton || !segmentList) return;

  let currentDraft = null;
  let currentSegments = [];
  let statusTimer = null;

  const getDraft = () => {
    const draft = window.rideLinkRouteDraft;
    if (!draft?.origin || !draft?.destination) return null;
    return draft;
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

  const createStop = ({ label, value, badge, className = '', empty = false }) => {
    const item = document.createElement('li');
    item.className = `confirm-stop ${className}${empty ? ' is-empty' : ''}`;
    const node = document.createElement('span');
    node.className = 'confirm-stop-node';
    node.textContent = badge;
    const text = document.createElement('div');
    const stopLabel = document.createElement('small');
    stopLabel.textContent = label;
    const stopValue = document.createElement('strong');
    stopValue.textContent = value;
    text.append(stopLabel, stopValue);
    item.append(node, text);
    return item;
  };

  const renderRoute = (draft) => {
    routeList.replaceChildren();
    routeList.append(createStop({ label: '出発地点', value: draft.origin, badge: '出', className: 'origin-stop' }));
    draft.waypoints.forEach((waypoint, index) => {
      routeList.append(createStop({
        label: `経由地点 ${index + 1}`,
        value: waypoint,
        badge: String(index + 1),
        className: 'waypoint-stop'
      }));
    });
    routeList.append(createStop({ label: '目的地', value: draft.destination, badge: '着', className: 'destination-stop' }));
    const hasReturn = Boolean(draft.returnPoint);
    routeList.append(createStop({
      label: '帰着地点',
      value: hasReturn ? draft.returnPoint : '設定なし',
      badge: '帰',
      className: 'return-stop',
      empty: !hasReturn
    }));
    returnNote.textContent = hasReturn
      ? '帰着地点をGoogleマップの最終目的地に設定します'
      : '帰着地点が未設定のため、目的地を最終目的地に設定します';
  };

  const createSegmentCard = (segment) => {
    const card = document.createElement('article');
    card.className = 'confirm-segment-card';
    const head = document.createElement('div');
    head.className = 'segment-card-head';
    const label = document.createElement('strong');
    label.textContent = `区間${segment.index}`;
    const route = document.createElement('small');
    route.className = 'segment-route';
    route.textContent = `${segment.origin} → ${segment.destination}`;
    head.append(label, route);

    const actions = document.createElement('div');
    actions.className = 'segment-card-actions';
    const openLink = document.createElement('a');
    openLink.href = segment.url;
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.textContent = 'Googleマップで開く';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.dataset.segmentIndex = String(segment.index - 1);
    copy.textContent = 'リンクをコピー';
    actions.append(openLink, copy);
    card.append(head, actions);
    return card;
  };

  const renderMapActions = (draft) => {
    currentDraft = draft;
    currentSegments = window.RideLinkTourLinks.buildGoogleMapsSegments(draft);
    segmentList.replaceChildren();
    const overLength = currentSegments.some((segment) => segment.overLengthLimit);

    if (currentSegments.length === 1) {
      singleMapActions.hidden = false;
      multiMapActions.hidden = true;
      mapsButton.href = currentSegments[0].url;
      mapsButton.removeAttribute('aria-disabled');
    } else {
      singleMapActions.hidden = true;
      multiMapActions.hidden = false;
      segmentCountMessage.textContent =
        `このルートはGoogleマップの制限により${currentSegments.length}区間に分かれます`;
      currentSegments.forEach((segment) => segmentList.append(createSegmentCard(segment)));
    }

    if (overLength) {
      mapsLimitNote.textContent = '地点名が長いため、一部のGoogleマップURLが長さ上限を超えています。地点名を短くしてください';
      mapsLimitNote.hidden = false;
    } else {
      mapsLimitNote.hidden = true;
    }
  };

  const renderConfirm = () => {
    if (window.location.hash !== '#confirm') return;
    const draft = getDraft();
    if (!draft) {
      currentDraft = null;
      currentSegments = [];
      emptyState.hidden = false;
      confirmContent.hidden = true;
      editButton.hidden = true;
      return;
    }

    emptyState.hidden = true;
    confirmContent.hidden = false;
    editButton.hidden = false;
    titleElement.textContent = draft.title || '名称未設定';
    renderRoute(draft);

    try {
      renderMapActions(draft);
    } catch {
      currentDraft = draft;
      currentSegments = [];
      singleMapActions.hidden = false;
      multiMapActions.hidden = true;
      mapsButton.removeAttribute('href');
      mapsButton.setAttribute('aria-disabled', 'true');
      mapsLimitNote.textContent = 'Googleマップ用URLを作成できませんでした';
      mapsLimitNote.hidden = false;
    }
    actionStatus.hidden = true;
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

  const copyText = async (text, successMessage = 'コピーしました') => {
    if (!text) {
      showStatus('共有リンクを作成できませんでした', 'error');
      return;
    }
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!fallbackCopy(text)) {
        throw new Error('copy-failed');
      }
      showStatus(successMessage);
    } catch {
      if (fallbackCopy(text)) showStatus(successMessage);
      else showStatus('コピーできませんでした。Googleマップで開いてURLを共有してください', 'error');
    }
  };

  const saveTour = () => {
    const draft = getDraft();
    if (!draft) {
      showStatus('保存するツーリングがありません', 'error');
      return;
    }
    try {
      const savedTour = window.RideLinkTourStorage.save(draft);
      window.rideLinkRouteDraft = savedTour;
      currentDraft = savedTour;
      saveButton.classList.add('saved');
      showStatus('この端末に保存しました');
    } catch {
      showStatus('端末に保存できませんでした。Safariのストレージ設定を確認してください', 'error');
    }
  };

  const returnToEdit = () => {
    const draft = getDraft();
    if (draft) {
      window.dispatchEvent(new CustomEvent('ride-link:edit-tour', {
        detail: { ...draft, waypoints: Array.isArray(draft.waypoints) ? [...draft.waypoints] : [] }
      }));
    }
    window.location.hash = '#create';
  };

  backButton.addEventListener('click', returnToEdit);
  editButton.addEventListener('click', returnToEdit);
  emptyState.querySelector('button').addEventListener('click', returnToEdit);
  copyButton.addEventListener('click', () => copyText(currentSegments[0]?.url));
  copyAllButton.addEventListener('click', () => {
    if (!currentDraft || !currentSegments.length) return;
    const text = window.RideLinkTourLinks.buildGoogleMapsShareText(currentDraft, currentSegments);
    copyText(text, 'すべてのリンクをコピーしました');
  });
  segmentList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-segment-index]');
    if (!button) return;
    const segment = currentSegments[Number(button.dataset.segmentIndex)];
    if (segment) copyText(segment.url, `区間${segment.index}のリンクをコピーしました`);
  });
  saveButton.addEventListener('click', saveTour);
  window.addEventListener('hashchange', renderConfirm);
  window.addEventListener('ride-link:route-ready', (event) => {
    window.rideLinkRouteDraft = event.detail;
  });

  renderConfirm();
})();