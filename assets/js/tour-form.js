(() => {
  const homeView = document.querySelector('#home-view');
  const createView = document.querySelector('#create-view');
  const confirmView = document.querySelector('#confirm-view');
  const savedView = document.querySelector('#saved-view');
  const backButton = document.querySelector('#create-back-button');
  const manualCard = document.querySelector('#manual-route-card');
  const aiCard = document.querySelector('#ai-route-card');
  const aiNotice = document.querySelector('#ai-notice');
  const form = document.querySelector('#tour-form');
  const titleInput = document.querySelector('#tour-title');
  const originInput = document.querySelector('#tour-origin');
  const destinationInput = document.querySelector('#tour-destination');
  const returnInput = document.querySelector('#tour-return');
  const returnSameOrigin = document.querySelector('#return-same-origin');
  const waypointList = document.querySelector('#waypoint-list');
  const addWaypointButton = document.querySelector('#add-waypoint-button');
  const errorSummary = document.querySelector('#form-error-summary');
  const successMessage = document.querySelector('#form-success-message');
  const navLinks = [...document.querySelectorAll('[data-view-link]')];

  if (!homeView || !createView || !form || !originInput || !destinationInput || !waypointList) return;

  let nextWaypointId = 1;
  let aiNoticeTimer = null;
  let savedReturnPoint = '';

  const currentView = () => {
    if (window.location.hash === '#create') return 'create';
    if (window.location.hash === '#confirm') return 'confirm';
    if (window.location.hash === '#saved' || window.location.hash === '#saved-list') return 'saved';
    return 'home';
  };

  const updateNavigation = () => {
    const hash = window.location.hash;
    const activeView = hash === '#create' || hash === '#confirm'
      ? 'create'
      : hash === '#saved' || hash === '#saved-list'
        ? 'saved'
        : 'home';

    navLinks.forEach((link) => {
      const active = link.dataset.viewLink === activeView;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  const renderView = () => {
    const view = currentView();
    const showHome = view === 'home';
    const showCreate = view === 'create';
    const showConfirm = view === 'confirm';
    const showSaved = view === 'saved';

    homeView.hidden = !showHome;
    createView.hidden = !showCreate;
    if (confirmView) confirmView.hidden = !showConfirm;
    if (savedView) savedView.hidden = !showSaved;
    document.body.classList.toggle('create-screen-open', !showHome);
    updateNavigation();
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (showHome) {
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
    }
  };

  const syncReturnPoint = () => {
    if (returnSameOrigin.checked) {
      returnInput.value = originInput.value.trim();
      returnInput.disabled = true;
      returnInput.setAttribute('aria-disabled', 'true');
    } else {
      returnInput.disabled = false;
      returnInput.removeAttribute('aria-disabled');
      returnInput.value = savedReturnPoint;
    }
  };

  const updateWaypointOrder = () => {
    const rows = [...waypointList.querySelectorAll('.waypoint-card')];

    rows.forEach((row, index) => {
      const number = row.querySelector('.waypoint-number');
      const label = row.querySelector('.waypoint-label');
      const input = row.querySelector('input');
      const upButton = row.querySelector('[data-action="up"]');
      const downButton = row.querySelector('[data-action="down"]');
      const removeButton = row.querySelector('[data-action="remove"]');
      const position = index + 1;

      number.textContent = position;
      label.textContent = `経由地点 ${position}`;
      input.setAttribute('aria-label', `経由地点 ${position}`);
      upButton.disabled = index === 0;
      downButton.disabled = index === rows.length - 1;
      upButton.setAttribute('aria-label', `経由地点 ${position}を上へ移動`);
      downButton.setAttribute('aria-label', `経由地点 ${position}を下へ移動`);
      removeButton.setAttribute('aria-label', `経由地点 ${position}を削除`);
    });
  };

  const createWaypoint = (value = '', { focus = true } = {}) => {
    const waypointId = nextWaypointId++;
    const row = document.createElement('div');
    row.className = 'waypoint-card';
    row.dataset.waypointId = String(waypointId);
    row.innerHTML = `
      <div class="waypoint-head">
        <div class="waypoint-title">
          <span class="waypoint-number"></span>
          <strong class="waypoint-label"></strong>
          <em>任意</em>
        </div>
        <div class="waypoint-controls">
          <button type="button" data-action="up" aria-label="上へ移動">↑</button>
          <button type="button" data-action="down" aria-label="下へ移動">↓</button>
          <button class="remove-waypoint" type="button" data-action="remove" aria-label="削除">×</button>
        </div>
      </div>
      <input id="waypoint-${waypointId}" name="waypoint" type="text" placeholder="例：道の駅 川場田園プラザ" autocomplete="off">
    `;
    waypointList.append(row);
    const input = row.querySelector('input');
    input.value = value;
    updateWaypointOrder();
    if (focus) input.focus();
  };

  const moveWaypoint = (row, direction) => {
    if (direction === 'up' && row.previousElementSibling) {
      waypointList.insertBefore(row, row.previousElementSibling);
    } else if (direction === 'down' && row.nextElementSibling) {
      waypointList.insertBefore(row.nextElementSibling, row);
    }
    updateWaypointOrder();
    row.querySelector(`[data-action="${direction}"]`).focus();
  };

  const showAiNotice = () => {
    window.clearTimeout(aiNoticeTimer);
    aiNotice.hidden = false;
    aiCard.classList.add('notice-active');
    aiNoticeTimer = window.setTimeout(() => {
      aiNotice.hidden = true;
      aiCard.classList.remove('notice-active');
    }, 3000);
  };

  const setFieldError = (input, errorElement, hasError) => {
    input.classList.toggle('has-error', hasError);
    input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    errorElement.hidden = !hasError;
  };

  const buildRouteData = () => {
    const previousDraft = window.rideLinkRouteDraft;
    const routeData = {
      title: titleInput.value.trim(),
      origin: originInput.value.trim(),
      waypoints: [...waypointList.querySelectorAll('input')]
        .map((input) => input.value.trim())
        .filter(Boolean),
      destination: destinationInput.value.trim(),
      returnPoint: returnSameOrigin.checked
        ? originInput.value.trim()
        : returnInput.value.trim()
    };

    if (previousDraft?.id) routeData.id = previousDraft.id;
    if (previousDraft?.createdAt) routeData.createdAt = previousDraft.createdAt;
    return routeData;
  };

  const validateRoute = () => {
    const originError = document.querySelector('#origin-error');
    const destinationError = document.querySelector('#destination-error');
    const missingOrigin = originInput.value.trim() === '';
    const missingDestination = destinationInput.value.trim() === '';

    setFieldError(originInput, originError, missingOrigin);
    setFieldError(destinationInput, destinationError, missingDestination);

    const missing = [];
    if (missingOrigin) missing.push('出発地点');
    if (missingDestination) missing.push('目的地');

    if (missing.length) {
      errorSummary.textContent = `${missing.join('・')}を入力してください`;
      errorSummary.hidden = false;
      successMessage.hidden = true;
      (missingOrigin ? originInput : destinationInput).focus();
      return null;
    }

    errorSummary.hidden = true;
    return buildRouteData();
  };

  const loadDraft = (draft) => {
    if (!draft) return;

    titleInput.value = String(draft.title || '');
    originInput.value = String(draft.origin || '');
    destinationInput.value = String(draft.destination || '');
    waypointList.replaceChildren();
    (Array.isArray(draft.waypoints) ? draft.waypoints : []).forEach((waypoint) => {
      createWaypoint(String(waypoint), { focus: false });
    });
    updateWaypointOrder();

    const returnPoint = String(draft.returnPoint || '');
    const sameAsOrigin = Boolean(returnPoint) && returnPoint === originInput.value.trim();
    savedReturnPoint = sameAsOrigin ? '' : returnPoint;
    returnSameOrigin.checked = sameAsOrigin;
    returnInput.value = returnPoint;
    syncReturnPoint();

    setFieldError(originInput, document.querySelector('#origin-error'), false);
    setFieldError(destinationInput, document.querySelector('#destination-error'), false);
    errorSummary.hidden = true;
    successMessage.hidden = true;
    window.rideLinkRouteDraft = {
      ...draft,
      waypoints: Array.isArray(draft.waypoints) ? [...draft.waypoints] : []
    };
  };

  window.RideLinkTourForm = Object.freeze({ loadDraft });
  window.addEventListener('ride-link:edit-tour', (event) => {
    loadDraft(event.detail);
  });

  backButton.addEventListener('click', () => {
    window.location.hash = '';
  });

  manualCard.addEventListener('click', () => {
    manualCard.classList.add('active');
    manualCard.setAttribute('aria-pressed', 'true');
    originInput.focus();
  });

  aiCard.addEventListener('click', showAiNotice);

  addWaypointButton.addEventListener('click', () => createWaypoint());

  waypointList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('.waypoint-card');
    if (!row) return;

    const action = button.dataset.action;
    if (action === 'remove') {
      row.remove();
      updateWaypointOrder();
      addWaypointButton.focus();
    } else {
      moveWaypoint(row, action);
    }
  });

  returnSameOrigin.addEventListener('change', () => {
    if (returnSameOrigin.checked) savedReturnPoint = returnInput.value;
    syncReturnPoint();
  });

  originInput.addEventListener('input', () => {
    if (returnSameOrigin.checked) returnInput.value = originInput.value.trim();
  });

  form.addEventListener('input', (event) => {
    successMessage.hidden = true;
    if (event.target === originInput && originInput.value.trim()) {
      setFieldError(originInput, document.querySelector('#origin-error'), false);
    }
    if (event.target === destinationInput && destinationInput.value.trim()) {
      setFieldError(destinationInput, document.querySelector('#destination-error'), false);
    }
    if (originInput.value.trim() && destinationInput.value.trim()) errorSummary.hidden = true;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const routeData = validateRoute();
    if (!routeData) return;

    window.rideLinkRouteDraft = routeData;
    window.dispatchEvent(new CustomEvent('ride-link:route-ready', { detail: routeData }));
    window.location.hash = '#confirm';
    successMessage.textContent = '入力内容を確認しました。次の確認画面へ渡す準備ができています';
    successMessage.hidden = false;
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  window.addEventListener('hashchange', renderView);
  renderView();
})();