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
  const mapsButton = document.querySelector('#open-google-maps');
  const copyButton = document.querySelector('#copy-share-link');
  const saveButton = document.querySelector('#save-tour-button');
  const actionStatus = document.querySelector('#confirm-action-status');

  if (!confirmView || !routeList || !mapsButton || !copyButton || !saveButton) return;

  let currentGoogleMapsUrl = '';
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
    routeList.append(createStop({
      label: '出発地点',
      value: draft.origin,
      badge: '出',
      className: 'origin-stop'
    }));

    draft.waypoints.forEach((waypoint, index) => {
      routeList.append(createStop({
        label: `経由地点 ${index + 1}`,
        value: waypoint,
        badge: String(index + 1),
        className: 'waypoint-stop'
      }));
    });

    routeList.append(createStop({
      label: '目的地',
      value: draft.destination,
      badge: '着',
      className: 'destination-stop'
    }));

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

  const renderConfirm = () => {
    if (window.location.hash !== '#confirm') return;
    const draft = getDraft();

    if (!draft) {
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
      const linkData = window.RideLinkTourLinks.buildGoogleMapsUrl(draft);
      currentGoogleMapsUrl = linkData.url;
      mapsButton.href = currentGoogleMapsUrl;
      mapsButton.removeAttribute('aria-disabled');

      if (linkData.overLengthLimit) {
        mapsLimitNote.textContent = '入力内容が長いためGoogleマップURLの上限を超えています。地点名を短くしてください';
        mapsLimitNote.hidden = false;
      } else if (linkData.omittedCount > 0) {
        mapsLimitNote.textContent = `iPhone向けGoogleマップURLの経由地点上限に合わせ、${linkData.omittedCount}件をURLから省略します`;
        mapsLimitNote.hidden = false;
      } else {
        mapsLimitNote.hidden = true;
      }
    } catch {
      currentGoogleMapsUrl = '';
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

  const copyShareLink = async () => {
    if (!currentGoogleMapsUrl) {
      showStatus('共有リンクを作成できませんでした', 'error');
      return;
    }

    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentGoogleMapsUrl);
      } else if (!fallbackCopy(currentGoogleMapsUrl)) {
        throw new Error('copy-failed');
      }
      showStatus('コピーしました');
    } catch {
      if (fallbackCopy(currentGoogleMapsUrl)) showStatus('コピーしました');
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
        detail: {
          ...draft,
          waypoints: Array.isArray(draft.waypoints) ? [...draft.waypoints] : []
        }
      }));
    }
    window.location.hash = '#create';
  };

  backButton.addEventListener('click', returnToEdit);
  editButton.addEventListener('click', returnToEdit);
  emptyState.querySelector('button').addEventListener('click', returnToEdit);
  copyButton.addEventListener('click', copyShareLink);
  saveButton.addEventListener('click', saveTour);
  window.addEventListener('hashchange', renderConfirm);
  window.addEventListener('ride-link:route-ready', (event) => {
    window.rideLinkRouteDraft = event.detail;
  });

  renderConfirm();
})();