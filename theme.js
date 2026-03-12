/**
 * theme.js — Тёмная/светлая тема + кастомизация портала
 * Загружает настройки из Supabase и применяет CSS переменные
 */
const THEME = (() => {
  const SB_URL  = 'https://ljtogliylpubvkckpwyv.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdG9nbGl5bHB1YnZrY2twd3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzEzODQsImV4cCI6MjA4ODc0NzM4NH0.91EQ_EEfi8X09Vm0jmH12_35R6tf0BwtTGoX3K5lgfc';
  const LS_THEME = 'portal_theme_override'; // пользователь может переключить локально

  // ── CSS переменные для тёмной темы ──
  const DARK = {
    '--bg':       '#0b1421',
    '--bg2':      '#101e30',
    '--bg3':      '#162238',
    '--card':     '#111d2e',
    '--card2':    '#162035',
    '--border':   'rgba(255,255,255,0.07)',
    '--text':     '#eef2ff',
    '--text2':    '#7a90b8',
    '--text3':    '#4a5f82',
    '--shadow':   '0 4px 24px rgba(0,0,0,0.4)',
  };

  // ── CSS переменные для светлой темы ──
  const LIGHT = {
    '--bg':       '#f0f4f8',
    '--bg2':      '#e4eaf2',
    '--bg3':      '#dae2ed',
    '--card':     '#ffffff',
    '--card2':    '#f7f9fc',
    '--border':   'rgba(0,0,0,0.09)',
    '--text':     '#1a2234',
    '--text2':    '#4a5f82',
    '--text3':    '#8a9ab8',
    '--shadow':   '0 4px 24px rgba(0,0,0,0.10)',
  };

  let _settings = {};
  let _currentTheme = 'dark';

  // ── Применить переменные ──
  function applyVars(vars) {
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  // ── Применить акцентный цвет ──
  function applyAccent(color) {
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
    const root = document.documentElement;
    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent2', color + 'cc');
    root.style.setProperty('--accent-dim', color + '22');
    // Обновляем theme-color мета тег
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = color;
  }

  // ── Применить тему ──
  function applyTheme(theme) {
    _currentTheme = theme;
    applyVars(theme === 'light' ? LIGHT : DARK);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LS_THEME, theme);
    // Обновляем иконку кнопки если есть
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
  }

  // ── Загрузить настройки из Supabase ──
  async function loadSettings() {
    try {
      const r = await fetch(
        `${SB_URL}/rest/v1/portal_settings?select=key,value`,
        { headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON } }
      );
      const rows = await r.json();
      rows.forEach(row => { _settings[row.key] = row.value; });
    } catch(e) {}
    return _settings;
  }

  // ── Сохранить настройку в Supabase ──
  async function saveSetting(key, value) {
    _settings[key] = value;
    await fetch(`${SB_URL}/rest/v1/portal_settings?key=eq.${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON }
    }).catch(() => {});
    await fetch(`${SB_URL}/rest/v1/portal_settings`, {
      method: 'POST',
      headers: {
        apikey: SB_ANON, Authorization: 'Bearer ' + SB_ANON,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
    });
  }

  // ── Инициализация ──
  async function init() {
    // Быстро применяем локальную тему (без ожидания Supabase)
    const localTheme = localStorage.getItem(LS_THEME) || 'dark';
    applyTheme(localTheme);

    // Загружаем настройки из Supabase
    await loadSettings();

    // Применяем серверную тему (если не переопределена пользователем)
    const serverTheme = _settings['portal_theme'] || 'dark';
    const userOverride = localStorage.getItem(LS_THEME + '_user');
    if (!userOverride) applyTheme(serverTheme);

    // Акцентный цвет
    if (_settings['portal_color']) applyAccent(_settings['portal_color']);

    // Название портала
    if (_settings['portal_name']) {
      document.querySelectorAll('.portal-name').forEach(el => {
        el.textContent = _settings['portal_name'];
      });
    }

    // Логотип
    if (_settings['portal_logo']) {
      document.querySelectorAll('.portal-logo').forEach(el => {
        el.textContent = _settings['portal_logo'];
      });
    }

    return _settings;
  }

  // ── Переключить тему пользователем ──
  function toggle() {
    const next = _currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(LS_THEME + '_user', '1');
  }

  function getTheme() { return _currentTheme; }
  function getSettings() { return { ..._settings }; }

  return { init, toggle, applyTheme, applyAccent, saveSetting, loadSettings, getTheme, getSettings };
})();

// Автоинициализация
document.addEventListener('DOMContentLoaded', () => THEME.init());
