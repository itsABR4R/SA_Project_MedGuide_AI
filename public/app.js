const state = {
  user: null,
  checks: [],
  currentCheck: null,
  severity: 'mild',
  explainMode: 'simple',
  chatHistory: [],
  aiConfigured: false,
  tourActive: false,
  tourIndex: 0,
  tourCompleting: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const productTourSteps = [
  {
    title: 'Welcome to MedGuide AI',
    copy: 'Your account is ready. This short tour shows where to enter symptoms, compare possible patterns, ask follow-up questions, review history, and update your profile.'
  },
  {
    tab: 'symptom',
    target: '#sym-in',
    title: 'Describe what you are feeling',
    copy: 'Add the symptoms, when they started, and what makes them better or worse. More context helps the AI return clearer informational guidance.'
  },
  {
    tab: 'symptom',
    target: '#severity-panel',
    title: 'Set the current severity',
    copy: 'Choose mild, moderate, or severe based on how you feel now. You can also use quick tags beside this panel.'
  },
  {
    tab: 'symptom',
    target: '#analyze-button',
    title: 'Create your guidance report',
    copy: 'Select Analyze Symptoms Now. The report opens the closest pattern first and shows 2–3 lower matches underneath for comparison—not as diagnoses.'
  },
  {
    tab: 'chat',
    target: '#nav-chat',
    title: 'Ask a follow-up question',
    copy: 'Use the AI Health Assistant for general explanations about your report. It cannot diagnose you or replace a clinician.'
  },
  {
    tab: 'history',
    target: '#nav-history',
    title: 'Return to previous checks',
    copy: 'Every completed symptom check is saved privately to your account. Open an earlier report here or delete it when you no longer need it.'
  },
  {
    tab: 'profile',
    target: '#nav-profile',
    title: 'Keep your profile current',
    copy: 'Optional age, blood type, and allergy details can give the assistant useful context. Select Finish to begin with the symptom checker.'
  }
];

let tourPreviousFocus = null;

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the app server. Make sure it is running and try again.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/login') showSignedOut();
    throw new ApiError(response.status, payload?.error?.code || 'REQUEST_FAILED', payload?.error?.message || 'The request failed.');
  }
  return payload;
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function showToast(message, error = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3600);
}

function setFormError(id, message = '') {
  const element = $(`#${id}`);
  element.textContent = message;
  element.classList.toggle('show', Boolean(message));
}

function setFormBusy(form, busy, busyLabel) {
  const button = $('button[type="submit"]', form);
  if (!button) return;
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? busyLabel : button.dataset.label;
}

function tourTarget(step = productTourSteps[state.tourIndex]) {
  if (!step?.target) return null;
  const target = $(step.target);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? target : null;
}

function renderTourProgress() {
  const progress = $('#tour-progress');
  progress.replaceChildren();
  productTourSteps.forEach((_step, index) => {
    const dot = createElement('span', `tour-dot${index === state.tourIndex ? ' active' : ''}`);
    progress.append(dot);
  });
}

function positionProductTour() {
  if (!state.tourActive) return;
  const layer = $('#product-tour');
  const card = $('#tour-card');
  const spotlight = $('#tour-spotlight');
  const target = tourTarget();

  card.style.left = '';
  card.style.top = '';
  card.style.right = '';
  card.style.bottom = '';
  card.style.transform = '';

  if (!target) {
    layer.classList.add('no-target');
    card.classList.add('centered');
    return;
  }

  layer.classList.remove('no-target');
  card.classList.remove('centered');
  const rect = target.getBoundingClientRect();
  const padding = 8;
  const left = Math.max(8, rect.left - padding);
  const top = Math.max(8, rect.top - padding);
  const width = Math.min(window.innerWidth - left - 8, rect.width + padding * 2);
  const height = Math.min(window.innerHeight - top - 8, rect.height + padding * 2);
  Object.assign(spotlight.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  });

  if (window.innerWidth <= 680) return;

  const margin = 18;
  const cardRect = card.getBoundingClientRect();
  const maxLeft = Math.max(14, window.innerWidth - cardRect.width - 14);
  let cardLeft = Math.min(Math.max(rect.left, 14), maxLeft);
  let cardTop;
  if (rect.bottom + margin + cardRect.height <= window.innerHeight - 14) {
    cardTop = rect.bottom + margin;
  } else if (rect.top - margin - cardRect.height >= 14) {
    cardTop = rect.top - margin - cardRect.height;
  } else {
    cardTop = Math.max(14, Math.min(window.innerHeight - cardRect.height - 14, rect.top));
    if (rect.right + margin + cardRect.width <= window.innerWidth - 14) cardLeft = rect.right + margin;
  }
  card.style.left = `${cardLeft}px`;
  card.style.top = `${cardTop}px`;
}

function showProductTourStep(index) {
  if (!state.tourActive) return;
  state.tourIndex = Math.max(0, Math.min(productTourSteps.length - 1, index));
  const step = productTourSteps[state.tourIndex];
  if (step.tab) switchTab(step.tab);

  $('#tour-step-label').textContent = `Step ${state.tourIndex + 1} of ${productTourSteps.length}`;
  $('#tour-title').textContent = step.title;
  $('#tour-copy').textContent = step.copy;
  $('#tour-back').disabled = state.tourIndex === 0 || state.tourCompleting;
  $('#tour-next').disabled = state.tourCompleting;
  $('#tour-next').textContent = state.tourIndex === productTourSteps.length - 1 ? 'Finish' : 'Next';
  $('#tour-skip').disabled = state.tourCompleting;
  renderTourProgress();

  const target = tourTarget(step);
  if (target) {
    const rect = target.getBoundingClientRect();
    if (rect.top < 12 || rect.bottom > window.innerHeight - 12) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  window.requestAnimationFrame(() => window.requestAnimationFrame(positionProductTour));
}

function hideProductTour() {
  const layer = $('#product-tour');
  state.tourActive = false;
  state.tourCompleting = false;
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
  window.removeEventListener('resize', positionProductTour);
  window.removeEventListener('scroll', positionProductTour, true);
  tourPreviousFocus?.focus?.();
  tourPreviousFocus = null;
}

async function completeProductTour(skipped = false) {
  if (!state.tourActive || state.tourCompleting) return;
  state.tourCompleting = true;
  showProductTourStep(state.tourIndex);
  try {
    const payload = await api('/api/onboarding', { method: 'PATCH', body: JSON.stringify({ completed: true }) });
    state.user = payload.user;
  } catch (error) {
    showToast(`The tour closed, but its completion could not be saved: ${error.message}`, true);
  } finally {
    hideProductTour();
    switchTab('symptom');
    if (!skipped) $('#sym-in')?.focus();
  }
}

function startProductTour() {
  if (state.tourActive || state.user?.onboardingCompleted !== false) return;
  const layer = $('#product-tour');
  tourPreviousFocus = document.activeElement;
  state.tourActive = true;
  state.tourCompleting = false;
  layer.hidden = false;
  layer.setAttribute('aria-hidden', 'false');
  window.addEventListener('resize', positionProductTour);
  window.addEventListener('scroll', positionProductTour, true);
  showProductTourStep(0);
  window.requestAnimationFrame(() => $('#tour-next')?.focus());
}

function maybeStartProductTour() {
  if (state.user?.onboardingCompleted === false) {
    window.requestAnimationFrame(startProductTour);
  }
}

function handleProductTourKeydown(event) {
  if (!state.tourActive) return false;
  if (event.key === 'Escape') {
    event.preventDefault();
    completeProductTour(true);
    return true;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    if (state.tourIndex === productTourSteps.length - 1) completeProductTour();
    else showProductTourStep(state.tourIndex + 1);
    return true;
  }
  if (event.key === 'ArrowLeft' && state.tourIndex > 0) {
    event.preventDefault();
    showProductTourStep(state.tourIndex - 1);
    return true;
  }
  if (event.key !== 'Tab') return false;

  const focusable = $$('button:not(:disabled)', $('#tour-card'));
  if (!focusable.length) return true;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!$('#tour-card').contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
  return true;
}

function showAuthMode(mode) {
  const login = mode === 'login';
  $('#login-tab').classList.toggle('active', login);
  $('#register-tab').classList.toggle('active', !login);
  $('#login-form').classList.toggle('active', login);
  $('#register-form').classList.toggle('active', !login);
  setFormError('login-error');
  setFormError('register-error');
  window.setTimeout(() => $(login ? '#login-email' : '#register-name')?.focus(), 0);
}

function showSignedOut() {
  if (state.tourActive) hideProductTour();
  state.user = null;
  state.checks = [];
  state.currentCheck = null;
  $('#auth-gate').classList.remove('hidden');
  showAuthMode('login');
}

function updateUserUi(checkCount = state.checks.length) {
  if (!state.user) return;
  const avatar = initials(state.user.name);
  $('#mini-avatar').textContent = avatar;
  $('#mini-user-name').textContent = state.user.name;
  $('#profile-avatar').textContent = avatar;
  $('#profile-name').textContent = state.user.name;
  $('#profile-email').textContent = state.user.email;
  $('#checks-count').textContent = String(checkCount);
  $('#profile-name-input').value = state.user.name || '';
  $('#profile-age').value = state.user.age ?? '';
  $('#profile-blood').value = state.user.bloodType || '';
  $('#profile-allergies').value = state.user.allergies || '';
  $('#ai-config-warning').classList.toggle('show', !state.aiConfigured);
  $('#chat-status').textContent = state.aiConfigured ? '● Ready' : '● Setup needed';
}

async function completeSignIn(payload) {
  state.user = payload.user;
  $('#auth-gate').classList.add('hidden');
  updateUserUi(0);
  await loadChecks();
  switchTab('symptom');
  maybeStartProductTour();
}

function switchTab(name) {
  if (!['symptom', 'chat', 'history', 'profile'].includes(name)) return;
  $$('.tab').forEach((tab) => tab.classList.remove('active'));
  $$('.nav-btn').forEach((button) => button.classList.remove('active'));
  $(`#tab-${name}`)?.classList.add('active');
  $(`#nav-${name}`)?.classList.add('active');
  if (name === 'history') loadChecks().catch((error) => showToast(error.message, true));
}

function setSev(button, value) {
  state.severity = value;
  $$('.input-side-col .sev-row .sev').forEach((item) => item.classList.remove('on'));
  button.classList.add('on');
}

function markSymptomInputInvalid() {
  const input = $('#sym-in');
  input.style.borderColor = '#dc2626';
  input.style.boxShadow = '0 0 0 3px rgba(220,38,38,.1)';
  input.focus();
  window.setTimeout(() => {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  }, 1800);
}

async function analyze() {
  const symptoms = $('#sym-in').value.trim();
  const tags = $$('.tag.on').map((tag) => tag.textContent.trim());
  if (!symptoms && tags.length === 0) {
    markSymptomInputInvalid();
    showToast('Describe your symptoms or select a quick tag.', true);
    return;
  }

  const analyzeButton = $('.input-main-col > .btn-p');
  analyzeButton.disabled = true;
  $('#v-input').style.display = 'none';
  $('#v-res').style.display = 'none';
  $('#v-steps').style.display = 'none';
  $('#v-load').classList.add('on');

  try {
    const payload = await api('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ symptoms, severity: state.severity, tags })
    });
    state.currentCheck = payload.check;
    renderCheck(payload.check);
    $('#v-load').classList.remove('on');
    $('#v-res').style.display = 'flex';
    await loadChecks();
  } catch (error) {
    $('#v-load').classList.remove('on');
    $('#v-input').style.display = 'flex';
    if (error.code === 'AI_NOT_CONFIGURED') $('#ai-config-warning').classList.add('show');
    showToast(error.message, true);
  } finally {
    analyzeButton.disabled = false;
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderConditions(conditions) {
  const list = $('#conditions-list');
  list.replaceChildren();
  if (!conditions.length) {
    const empty = createElement('div', 'empty-state');
    empty.append(createElement('h3', '', 'No condition pattern shown'));
    empty.append(createElement('p', '', 'The details may be insufficient, or the report may need direct medical assessment. Review the next-step guidance below.'));
    list.append(empty);
    return;
  }

  const matchLabels = { strong: 'Strong pattern', possible: 'Possible pattern', limited: 'Limited pattern' };
  const matchClasses = { strong: 'strong', possible: 'partial', limited: 'lowm' };
  const urgencyLabels = { routine: 'Routine', soon: 'Soon', urgent: 'Urgent' };
  const urgencyClasses = { routine: 'ul', soon: 'um', urgent: 'uh' };

  conditions.forEach((condition, index) => {
    if (index === 1) {
      const heading = createElement('div', 'other-matches-heading');
      const copy = createElement('div');
      copy.append(createElement('strong', '', 'Other possible matches'));
      copy.append(createElement('span', '', 'Lower matches are included for comparison and are not diagnoses.'));
      const count = conditions.length - 1;
      heading.append(copy, createElement('div', 'match-count', `${count} lower ${count === 1 ? 'match' : 'matches'}`));
      list.append(heading);
    }

    const card = createElement('div', `cc ${index === 0 ? 'primary-match' : 'secondary-match'}`);
    card.id = `condition-${index}`;

    const header = createElement('div', 'ch');
    header.tabIndex = 0;
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
    const toggle = () => {
      const wasOpen = card.classList.contains('open');
      $$('.cc', list).forEach((item) => {
        item.classList.remove('open');
        $('.ch', item)?.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        card.classList.add('open');
        header.setAttribute('aria-expanded', 'true');
      }
    };
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });

    const left = createElement('div', 'cl');
    left.append(createElement('div', 'cn', condition.name));
    left.append(createElement('div', `cu ${urgencyClasses[condition.urgency] || 'um'}`, `Follow-up: ${urgencyLabels[condition.urgency] || 'Soon'}`));
    const right = createElement('div', 'cr');
    right.append(createElement('span', `badge ${matchClasses[condition.matchLevel] || 'partial'}`, matchLabels[condition.matchLevel] || 'Possible pattern'));
    right.append(createElement('span', 'chev', '⌄'));
    header.append(left, right);

    const body = createElement('div', 'cb');
    const symptomsSection = createElement('div', 'es');
    symptomsSection.append(createElement('div', 'el', 'Matched symptoms'));
    const chips = createElement('div', 'chips');
    const matched = condition.matchedSymptoms.length ? condition.matchedSymptoms : ['Reported details'];
    matched.forEach((symptom) => chips.append(createElement('span', 'chip', symptom)));
    symptomsSection.append(chips);

    const explanationSection = createElement('div', 'es');
    explanationSection.append(createElement('div', 'el', 'How the AI interpreted this pattern'));
    const explanation = createElement('div', 'at');
    explanation.dataset.simple = condition.simpleExplanation;
    explanation.dataset.detailed = condition.detailedExplanation;
    explanation.textContent = state.explainMode === 'simple' ? condition.simpleExplanation : condition.detailedExplanation;
    explanationSection.append(explanation);

    const actions = createElement('div', 'cb-btns');
    const sourceButton = createElement('button', 'btn-src', 'Sources');
    sourceButton.type = 'button';
    sourceButton.addEventListener('click', () => openSources(condition.sourceIds));
    const chatButton = createElement('button', 'btn-chat', 'Discuss with AI');
    chatButton.type = 'button';
    chatButton.addEventListener('click', () => discussCondition(condition));
    actions.append(sourceButton, chatButton);
    body.append(symptomsSection, explanationSection, actions);
    card.append(header, body);
    if (index === 0) card.classList.add('open');
    list.append(card);
  });
}

function renderTips(containerId, items, alert = false) {
  const container = $(`#${containerId}`);
  container.replaceChildren();
  const safeItems = items.length ? items : ['No additional guidance was returned. Contact a clinician if you are concerned.'];
  safeItems.forEach((text) => {
    const item = createElement('div', 'tip-item');
    item.append(createElement('div', `tip-dot${alert ? ' alert' : ''}`));
    item.append(createElement('div', 'tip-txt', text));
    container.append(item);
  });
}

function renderCheck(check) {
  state.currentCheck = check;
  const analysis = check.analysis;
  $('#analysis-summary').textContent = analysis.summary;
  const urgent = $('#urgent-result');
  urgent.textContent = analysis.urgentMessage || '';
  urgent.classList.toggle('show', Boolean(analysis.urgent && analysis.urgentMessage));
  renderConditions(analysis.conditions || []);
  renderTips('self-care-list', analysis.selfCare || []);
  renderTips('clinician-list', analysis.seeClinician || [], true);
  setExplain(state.explainMode);
}

function goBack() {
  $('#v-res').style.display = 'none';
  $('#v-steps').style.display = 'none';
  $('#v-input').style.display = 'flex';
  $$('.cc').forEach((card) => card.classList.remove('open'));
}

function showSteps() {
  $('#v-res').style.display = 'none';
  $('#v-steps').style.display = 'flex';
}

function hideSteps() {
  $('#v-steps').style.display = 'none';
  $('#v-res').style.display = 'flex';
}

function setExplain(mode) {
  state.explainMode = mode === 'detailed' ? 'detailed' : 'simple';
  $('#exp-simple')?.classList.toggle('on', state.explainMode === 'simple');
  $('#exp-detailed')?.classList.toggle('on', state.explainMode === 'detailed');
  $$('#v-res .at').forEach((element) => {
    const text = element.dataset[state.explainMode];
    if (text) element.textContent = text;
  });
}

function availableSources(sourceIds) {
  const allowed = new Set(sourceIds || []);
  return (state.currentCheck?.sources || []).filter((source) => allowed.size === 0 || allowed.has(source.id));
}

function openSources(sourceIds = []) {
  const body = $('#source-modal-body');
  body.replaceChildren();
  const sources = availableSources(sourceIds);
  if (!sources.length) {
    const empty = createElement('div', 'empty-state');
    empty.append(createElement('h3', '', 'No source selected'));
    empty.append(createElement('p', '', 'The AI did not select a reviewed source for this part of the guidance.'));
    body.append(empty);
  } else {
    sources.forEach((source) => {
      const item = createElement('div', 'src-item');
      const link = createElement('a', 'src-ttl');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.append(document.createTextNode(source.title));
      link.append(createElement('span', 'source-link-icon', '↗'));
      item.append(link);
      item.append(createElement('div', 'src-desc', source.description));
      const meta = createElement('div', 'src-meta');
      meta.append(createElement('span', 'src-date', source.organization));
      meta.append(createElement('span', 'src-conf', 'REVIEWED'));
      item.append(meta);
      body.append(item);
    });
  }
  openModal();
}

function openModal() {
  const modal = $('#src-modal');
  modal.style.display = 'flex';
  window.setTimeout(() => modal.classList.add('active'), 10);
}

function closeModal() {
  const modal = $('#src-modal');
  modal.classList.remove('active');
  window.setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function appendChatMessage(role, text, { addToHistory = true } = {}) {
  const messages = $('#chat-msgs');
  const element = createElement('div', `msg ${role === 'user' ? 'user' : 'ai'}`, text);
  messages.append(element);
  messages.scrollTop = messages.scrollHeight;
  if (addToHistory) state.chatHistory.push({ role: role === 'user' ? 'user' : 'assistant', content: text });
  return element;
}

function appendThinking() {
  const element = createElement('div', 'msg ai chat-thinking');
  element.id = 'chat-thinking';
  element.setAttribute('aria-label', 'Assistant is thinking');
  element.append(createElement('span'), createElement('span'), createElement('span'));
  $('#chat-msgs').append(element);
  $('#chat-msgs').scrollTop = $('#chat-msgs').scrollHeight;
}

function discussCondition(condition) {
  const intro = `${condition.name}: ${state.explainMode === 'simple' ? condition.simpleExplanation : condition.detailedExplanation}\n\nWhat would you like to understand about this possible pattern?`;
  appendChatMessage('assistant', intro);
  switchTab('chat');
  $('#chat-in').focus();
}

async function sendMsg() {
  const input = $('#chat-in');
  const text = input.value.trim();
  if (!text || $('#chat-send').disabled) return;
  const priorHistory = state.chatHistory.slice(-10);
  appendChatMessage('user', text);
  input.value = '';
  input.style.height = 'auto';
  $('#chat-send').disabled = true;
  $('#chat-status').textContent = '● Thinking';
  appendThinking();

  try {
    const payload = await api('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text, history: priorHistory })
    });
    $('#chat-thinking')?.remove();
    appendChatMessage('assistant', payload.reply);
    $('#chat-status').textContent = '● Ready';
  } catch (error) {
    $('#chat-thinking')?.remove();
    appendChatMessage('assistant', `I couldn't send that request: ${error.message}`, { addToHistory: false });
    $('#chat-status').textContent = error.code === 'AI_NOT_CONFIGURED' ? '● Setup needed' : '● Try again';
    if (error.code === 'AI_NOT_CONFIGURED') $('#ai-config-warning').classList.add('show');
  } finally {
    $('#chat-send').disabled = false;
    input.focus();
  }
}

function chatKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMsg();
  }
}

function historyTitle(check) {
  const firstLine = check.symptoms?.split('\n')[0]?.trim();
  if (firstLine) return firstLine.length > 82 ? `${firstLine.slice(0, 79)}…` : firstLine;
  return check.tags?.length ? check.tags.join(', ') : 'Symptom check';
}

function renderHistory() {
  const list = $('#history-list');
  list.replaceChildren();
  if (!state.checks.length) {
    const empty = createElement('div', 'empty-state');
    empty.append(createElement('h3', '', 'No saved checks yet'));
    empty.append(createElement('p', '', 'Complete a symptom check and it will be saved to your account here.'));
    list.append(empty);
    return;
  }

  state.checks.forEach((check) => {
    const card = createElement('article', 'history-card');
    const content = createElement('div');
    content.append(createElement('div', 'history-date', new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(check.createdAt))));
    content.append(createElement('div', 'history-title', historyTitle(check)));
    const meta = createElement('div', 'history-meta');
    meta.append(createElement('span', 'chip', check.severity));
    (check.tags || []).slice(0, 4).forEach((tag) => meta.append(createElement('span', 'chip', tag)));
    content.append(meta);

    const actions = createElement('div', 'history-actions');
    const openButton = createElement('button', 'btn-small', 'Open report');
    openButton.type = 'button';
    openButton.addEventListener('click', () => openHistoryCheck(check));
    const deleteButton = createElement('button', 'btn-small danger', 'Delete');
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', () => deleteHistoryCheck(check));
    actions.append(openButton, deleteButton);
    card.append(content, actions);
    list.append(card);
  });
}

async function loadChecks() {
  if (!state.user) return;
  const payload = await api('/api/checks');
  state.checks = payload.checks;
  renderHistory();
  updateUserUi(state.checks.length);
}

function openHistoryCheck(check) {
  state.currentCheck = check;
  renderCheck(check);
  switchTab('symptom');
  $('#v-input').style.display = 'none';
  $('#v-load').classList.remove('on');
  $('#v-steps').style.display = 'none';
  $('#v-res').style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteHistoryCheck(check) {
  if (!window.confirm('Delete this saved symptom check? This cannot be undone.')) return;
  try {
    await api(`/api/checks/${encodeURIComponent(check.id)}`, { method: 'DELETE' });
    if (state.currentCheck?.id === check.id) state.currentCheck = null;
    await loadChecks();
    showToast('Saved check deleted.');
  } catch (error) {
    showToast(error.message, true);
  }
}

async function signOut() {
  try {
    await api('/api/logout', { method: 'POST' });
  } catch {
    // Showing the signed-out screen is still the safest local state.
  }
  $('#chat-msgs').replaceChildren(createElement('div', 'msg ai', "Hello! I'm your AI health assistant. How can I help you today?"));
  state.chatHistory = [];
  showSignedOut();
}

async function boot() {
  bindForms();
  try {
    const payload = await api('/api/me');
    state.user = payload.user;
    state.aiConfigured = payload.aiConfigured;
    $('#auth-gate').classList.add('hidden');
    updateUserUi(payload.checkCount);
    await loadChecks();
    maybeStartProductTour();
  } catch (error) {
    if (error.status !== 401) setFormError('login-error', error.message);
    showSignedOut();
  }
}

function bindForms() {
  $('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError('login-error');
    setFormBusy(form, true, 'Signing In…');
    const data = new FormData(form);
    try {
      const payload = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') })
      });
      const health = await api('/api/health');
      state.aiConfigured = health.aiConfigured;
      form.reset();
      await completeSignIn(payload);
    } catch (error) {
      setFormError('login-error', error.message);
    } finally {
      setFormBusy(form, false, 'Signing In…');
    }
  });

  $('#register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError('register-error');
    setFormBusy(form, true, 'Creating Account…');
    const data = new FormData(form);
    try {
      const payload = await api('/api/register', {
        method: 'POST',
        body: JSON.stringify({ name: data.get('name'), email: data.get('email'), password: data.get('password') })
      });
      const health = await api('/api/health');
      state.aiConfigured = health.aiConfigured;
      form.reset();
      await completeSignIn(payload);
      showToast('Account created.');
    } catch (error) {
      setFormError('register-error', error.message);
    } finally {
      setFormBusy(form, false, 'Creating Account…');
    }
  });

  $('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    $('#profile-save-status').textContent = 'Saving…';
    try {
      const payload = await api('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: data.get('name'),
          age: data.get('age'),
          bloodType: data.get('bloodType'),
          allergies: data.get('allergies')
        })
      });
      state.user = payload.user;
      updateUserUi();
      $('#profile-save-status').textContent = 'Saved';
      window.setTimeout(() => { $('#profile-save-status').textContent = ''; }, 1800);
    } catch (error) {
      $('#profile-save-status').textContent = '';
      showToast(error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  $('#tour-back').addEventListener('click', () => showProductTourStep(state.tourIndex - 1));
  $('#tour-next').addEventListener('click', () => {
    if (state.tourIndex === productTourSteps.length - 1) completeProductTour();
    else showProductTourStep(state.tourIndex + 1);
  });
  $('#tour-skip').addEventListener('click', () => completeProductTour(true));

  document.addEventListener('keydown', (event) => {
    if (handleProductTourKeydown(event)) return;
    if (event.key === 'Escape') closeModal();
  });
}

Object.assign(window, {
  analyze,
  chatKey,
  closeModal,
  goBack,
  hideSteps,
  openModal,
  sendMsg,
  setExplain,
  setSev,
  showAuthMode,
  showSteps,
  signOut,
  switchTab
});

boot();
