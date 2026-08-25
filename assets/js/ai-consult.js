(() => {
  const view = document.querySelector('#ai-consult-view');
  const backButton = document.querySelector('#ai-consult-back-button');
  const form = document.querySelector('#ai-consult-form');
  const originInput = document.querySelector('#ai-origin');
  const areaInput = document.querySelector('#ai-area');
  const distanceInput = document.querySelector('#ai-distance');
  const notesInput = document.querySelector('#ai-notes');
  const promptPreview = document.querySelector('#ai-prompt-preview');
  const copyPromptButton = document.querySelector('#copy-ai-prompt');
  const answerInput = document.querySelector('#ai-answer');
  const applyButton = document.querySelector('#apply-ai-route');
  const status = document.querySelector('#ai-consult-status');

  if (!view || !form || !originInput || !promptPreview || !answerInput) return;

  let statusTimer = null;

  const showStatus = (message, type = 'success', persistent = false) => {
    window.clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.toggle('error', type === 'error');
    status.classList.toggle('warning', type === 'warning');
    status.hidden = false;
    if (!persistent) {
      statusTimer = window.setTimeout(() => {
        status.hidden = true;
      }, 5000);
    }
  };

  const getPreferences = () => [...form.querySelectorAll('input[name="preference"]:checked')]
    .map((input) => input.value);

  const buildPrompt = () => {
    const origin = originInput.value.trim();
    const area = areaInput.value.trim();
    const distance = distanceInput.value.trim();
    const highway = form.querySelector('input[name="highway"]:checked')?.value || 'どちらでもよい';
    const preferences = getPreferences();
    const notes = notesInput.value.trim();

    return [
      'バイクの日帰りツーリングルートを提案してください。',
      '',
      '【希望条件】',
      `出発地点：${origin || '未入力'}`,
      `希望エリア：${area || '指定なし'}`,
      `だいたいの走行距離：${distance || '指定なし'}`,
      `高速道路：${highway}`,
      `希望する内容：${preferences.length ? preferences.join('、') : '指定なし'}`,
      `自由記述：${notes || 'なし'}`,
      '',
      '【必須条件】',
      '・バイクの日帰りツーリングルートとして考えてください。',
      '・各地点は実在する施設名、観光地名、店舗名など、Googleマップで検索できる具体的な場所名にしてください。',
      '・地点の順番を明確にしてください。',
      '・余計な説明は最小限にしてください。',
      '・必ず次の固定形式だけで出力してください。',
      '',
      'ツーリング名：',
      '出発地：',
      '経由地1：',
      '経由地2：',
      '経由地3：',
      '目的地：',
      '帰着地：',
      '',
      '経由地が増える場合は、経由地4、経由地5のように連番で追加してください。'
    ].join('\n');
  };

  const updatePromptPreview = () => {
    promptPreview.value = buildPrompt();
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

  const copyPrompt = async () => {
    if (!originInput.value.trim()) {
      originInput.classList.add('has-error');
      originInput.setAttribute('aria-invalid', 'true');
      document.querySelector('#ai-origin-error').hidden = false;
      showStatus('出発地点を入力してください', 'error', true);
      originInput.focus();
      return;
    }

    const prompt = buildPrompt();
    promptPreview.value = prompt;
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      } else if (!fallbackCopy(prompt)) {
        throw new Error('copy-failed');
      }
      showStatus('相談文をコピーしました');
    } catch {
      if (fallbackCopy(prompt)) showStatus('相談文をコピーしました');
      else showStatus('相談文をコピーできませんでした。相談文を長押ししてコピーしてください', 'error', true);
    }
  };

  const parseAiAnswer = (answer) => {
    const fields = {
      title: '',
      origin: '',
      destination: '',
      returnPoint: ''
    };
    const waypoints = new Map();
    const found = new Set();

    answer.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine
        .trim()
        .replace(/^[-・●*]+\s*/, '')
        .replace(/\*\*/g, '');
      const match = line.match(/^(ツーリング名|出発地(?:点)?|目的地|帰着地(?:点)?|経由地\s*(\d+))\s*[：:]\s*(.*?)\s*$/);
      if (!match) return;
      const label = match[1];
      const value = match[3].trim();
      if (!value) return;

      if (label === 'ツーリング名') {
        fields.title = value;
        found.add('ツーリング名');
      } else if (/^出発地/.test(label)) {
        fields.origin = value;
        found.add('出発地');
      } else if (label === '目的地') {
        fields.destination = value;
        found.add('目的地');
      } else if (/^帰着地/.test(label)) {
        fields.returnPoint = value;
        found.add('帰着地');
      } else {
        const number = Number(match[2]);
        if (Number.isInteger(number) && number > 0) {
          waypoints.set(number, value);
          found.add(`経由地${number}`);
        }
      }
    });

    const orderedWaypoints = [...waypoints.entries()]
      .sort((a, b) => a[0] - b[0])
      .map((entry) => entry[1]);
    const missingRequired = [];
    if (!fields.origin) missingRequired.push('出発地');
    if (!fields.destination) missingRequired.push('目的地');

    return {
      route: { ...fields, waypoints: orderedWaypoints },
      found: [...found],
      missingRequired,
      missingOptional: [
        ...(!fields.title ? ['ツーリング名'] : []),
        ...(!orderedWaypoints.length ? ['経由地'] : []),
        ...(!fields.returnPoint ? ['帰着地'] : [])
      ]
    };
  };

  const applyAiRoute = () => {
    const answer = answerInput.value.trim();
    if (!answer) {
      showStatus('AIの回答を貼り付けてください', 'error', true);
      answerInput.focus();
      return;
    }

    const parsed = parseAiAnswer(answer);
    if (!parsed.found.length) {
      showStatus('回答形式を確認してください。項目名と「：」を含む固定形式で貼り付けてください', 'error', true);
      return;
    }
    if (parsed.missingRequired.length) {
      showStatus(
        `取得できた項目：${parsed.found.join('、')}／不足項目：${parsed.missingRequired.join('、')}。回答形式を確認してください`,
        'error',
        true
      );
      return;
    }

    window.rideLinkRouteDraft = parsed.route;
    window.location.hash = '#create';
    window.dispatchEvent(new CustomEvent('ride-link:ai-route-import', {
      detail: {
        route: parsed.route,
        found: parsed.found,
        missingOptional: parsed.missingOptional
      }
    }));
  };

  backButton.addEventListener('click', () => {
    window.location.hash = '#create';
  });
  form.addEventListener('input', () => {
    updatePromptPreview();
    status.hidden = true;
    if (originInput.value.trim()) {
      originInput.classList.remove('has-error');
      originInput.setAttribute('aria-invalid', 'false');
      document.querySelector('#ai-origin-error').hidden = true;
    }
  });
  form.addEventListener('change', updatePromptPreview);
  copyPromptButton.addEventListener('click', copyPrompt);
  applyButton.addEventListener('click', applyAiRoute);
  updatePromptPreview();

  window.RideLinkAiConsult = Object.freeze({ buildPrompt, parseAiAnswer });
})();