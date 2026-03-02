type StatsView = "weekly" | "monthly" | "all-time" | "total";
type NavView = "app" | "invites" | StatsView;

function shell(title: string, body: string, scripts = ""): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f7fafc;
      --text: #1a202c;
      --muted: #4a5568;
      --card: #ffffff;
      --card-shadow: 0 1px 4px rgba(0,0,0,.08);
      --sidebar-bg: #1f2937;
      --sidebar-text: #e5e7eb;
      --sidebar-muted: #9ca3af;
      --sidebar-link: #d1d5db;
      --sidebar-link-active-bg: #374151;
      --sidebar-link-active-text: #ffffff;
      --input-bg: #ffffff;
      --input-border: #cbd5e0;
      --input-text: #1a202c;
      --primary-bg: #2b6cb0;
      --primary-text: #ffffff;
      --call-btn-bg: #b45309;
      --call-btn-hover-bg: #92400e;
      --call-btn-text: #ffffff;
      --error: #c53030;
      --chart-line: #60a5fa;
      --chart-grid: #e2e8f0;
      --chart-text: #4a5568;
      --metric-bg: #f8fafc;
      --metric-border: #e2e8f0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --text: #e2e8f0;
        --muted: #94a3b8;
        --card: #111827;
        --card-shadow: 0 1px 4px rgba(0,0,0,.35);
        --sidebar-bg: #020617;
        --sidebar-text: #e2e8f0;
        --sidebar-muted: #94a3b8;
        --sidebar-link: #cbd5e1;
        --sidebar-link-active-bg: #1e293b;
        --sidebar-link-active-text: #f8fafc;
        --input-bg: #0b1220;
        --input-border: #334155;
        --input-text: #e2e8f0;
        --primary-bg: #2563eb;
        --primary-text: #f8fafc;
        --call-btn-bg: #f59e0b;
        --call-btn-hover-bg: #fbbf24;
        --call-btn-text: #0f172a;
        --error: #f87171;
        --chart-line: #60a5fa;
        --chart-grid: #334155;
        --chart-text: #94a3b8;
        --metric-bg: #1e293b;
        --metric-border: #334155;
      }
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: var(--bg); color: var(--text); }
    .layout { display: flex; height: 100dvh; overflow: hidden; }
    .sidebar { width: 260px; height: 100dvh; background: var(--sidebar-bg); color: var(--sidebar-text); padding: 20px 14px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .brand { font-weight: 700; font-size: 18px; padding: 10px 12px; }
    .menu-toggle {
      display: none;
      border: 1px solid var(--sidebar-link-active-bg);
      background: transparent;
      color: var(--sidebar-link-active-text);
      border-radius: 8px;
      padding: 8px 10px;
      min-height: 40px;
      font-size: 14px;
      cursor: pointer;
      white-space: nowrap;
    }
    .mobile-menu { display: flex; flex-direction: column; gap: 14px; flex: 1 1 auto; min-height: 0; }
    .user-email { padding: 0 12px; color: var(--sidebar-muted); display: flex; align-items: center; gap: 8px; min-width: 0; }
    .user-email-icon { flex: 0 0 auto; }
    .user-email-text { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .nav { display: grid; gap: 8px; }
    .nav a, .nav button { width: 100%; text-align: left; border: 0; background: transparent; color: var(--sidebar-link); text-decoration: none; border-radius: 8px; padding: 10px 12px; cursor: pointer; font-size: 14px; min-height: 44px; display: flex; align-items: center; }
    .nav a.active { background: var(--sidebar-link-active-bg); color: var(--sidebar-link-active-text); }
    .nav a:hover, .nav button:hover { background: var(--sidebar-link-active-bg); color: var(--sidebar-link-active-text); }
    .sidebar-footer { margin-top: auto; }
    .main { flex: 1; height: 100dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 24px; }
    .container { max-width: 980px; margin: 0 auto; display: grid; gap: 14px; }
    .card { background: var(--card); border-radius: 12px; box-shadow: var(--card-shadow); padding: 20px; }
    .row { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
    .stack { display: grid; gap: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .muted { color: var(--muted); }
    .stat { font-size: 30px; font-weight: 700; }
    .error { color: var(--error); min-height: 1em; }
    .metrics-grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .metric-card { background: var(--metric-bg); border: 1px solid var(--metric-border); border-radius: 10px; padding: 12px; }
    .metric-label { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
    .metric-value { font-weight: 700; font-size: 18px; word-break: break-word; }
    .icon { margin-right: 8px; }
    .icon-muted { color: var(--sidebar-muted); }
    .icon-primary { color: var(--primary-bg); }
    .icon-call { color: var(--call-btn-bg); }
    .icon-chart { color: var(--chart-line); }
    .icon-error { color: var(--error); }
    h1, h2 { margin: 0; }
    input { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--input-border); width: 100%; background: var(--input-bg); color: var(--input-text); }
    button.primary { border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-weight: 600; background: var(--primary-bg); color: var(--primary-text); }
    .button-call { border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-weight: 700; background: var(--call-btn-bg); color: var(--call-btn-text); }
    .button-call:hover { background: var(--call-btn-hover-bg); }
    canvas { width: 100% !important; height: 280px !important; display: block; }
    @media (max-width: 900px) {
      .layout { flex-direction: column; height: auto; min-height: 100dvh; overflow: visible; }
      .sidebar {
        width: 100%;
        height: auto;
        overflow: visible;
        position: sticky;
        top: 0;
        z-index: 20;
        padding: 10px;
        gap: 8px;
      }
      .sidebar-header { padding: 2px 4px; }
      .brand { font-size: 16px; padding: 6px 4px; }
      .menu-toggle { display: inline-flex; align-items: center; justify-content: center; }
      .mobile-menu { display: none; gap: 8px; }
      .sidebar.open .mobile-menu { display: flex; }
      .user-email { padding: 0 8px; }
      .nav-main { display: grid; gap: 6px; }
      .nav-main a {
        width: 100%;
        white-space: normal;
        padding: 8px 10px;
        min-height: 40px;
      }
      .sidebar-footer { margin-top: 0; }
      .sidebar-footer button {
        width: 100%;
        white-space: normal;
        padding: 8px 10px;
        min-height: 40px;
      }
      .main { height: auto; overflow: visible; padding: 12px; }
      .container { gap: 10px; }
      .card { padding: 14px; border-radius: 10px; }
      .row { flex-direction: column; align-items: flex-start; }
      h1 { font-size: 22px; }
      h2 { font-size: 18px; }
      .stat { font-size: 26px; }
      .button-call, button.primary { width: 100%; justify-content: center; }
      canvas { height: 220px !important; }
    }
    @media (max-width: 640px) {
      .grid-2 { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: 1fr; }
      .brand { font-size: 15px; }
      .user-email { font-size: 13px; }
      .metric-value { font-size: 16px; }
    }
  </style>
</head>
<body>
${body}
${scripts}
</body>
</html>`;
}

function sidebar(active: NavView, userName: string, showInviteLink: boolean): string {
  return `<aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand"><i class="fa-solid fa-headset icon icon-primary" aria-hidden="true"></i>Call Center Counter</div>
        <button id="menu-toggle" class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu"><i class="fa-solid fa-bars icon" aria-hidden="true"></i>Menu</button>
      </div>
      <div id="mobile-menu" class="mobile-menu">
        <div class="user-email" title="${userName}">
          <span class="user-email-icon"><i class="fa-solid fa-user icon-muted" aria-hidden="true"></i></span>
          <span class="user-email-text">${userName}</span>
        </div>
        <nav class="nav nav-main">
          <a class="${active === "app" ? "active" : ""}" href="/app"><i class="fa-solid fa-house icon" aria-hidden="true"></i>Counter</a>
          ${showInviteLink ? `<a class="${active === "invites" ? "active" : ""}" href="/admin/invites"><i class="fa-solid fa-link icon" aria-hidden="true"></i>Invites</a>` : ""}
          <a class="${active === "weekly" ? "active" : ""}" href="/stats/weekly"><i class="fa-solid fa-chart-line icon" aria-hidden="true"></i>Weekly</a>
          <a class="${active === "monthly" ? "active" : ""}" href="/stats/monthly"><i class="fa-solid fa-calendar-days icon" aria-hidden="true"></i>Monthly</a>
          <a class="${active === "all-time" ? "active" : ""}" href="/stats/all-time"><i class="fa-solid fa-trophy icon" aria-hidden="true"></i>All-Time</a>
          <a class="${active === "total" ? "active" : ""}" href="/stats/total"><i class="fa-solid fa-globe icon" aria-hidden="true"></i>Total</a>
        </nav>
        <div class="sidebar-footer nav nav-footer">
          <button id="logout"><i class="fa-solid fa-right-from-bracket icon" aria-hidden="true"></i>Logout</button>
        </div>
      </div>
    </aside>`;
}

function authLayout(title: string, active: NavView, userName: string, content: string, scripts = "", showInviteLink = false): string {
  return shell(
    title,
    `<div class="layout">
      ${sidebar(active, userName, showInviteLink)}
      <main class="main">
        <div class="container">${content}</div>
      </main>
    </div>`,
    `${scripts}
    <script>
      const sidebarEl = document.querySelector('.sidebar');
      const menuToggle = document.getElementById('menu-toggle');
      const navLinks = document.querySelectorAll('.nav-main a');

      if (menuToggle && sidebarEl) {
        menuToggle.addEventListener('click', () => {
          const isOpen = sidebarEl.classList.toggle('open');
          menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        navLinks.forEach((link) => {
          link.addEventListener('click', () => {
            if (window.innerWidth <= 900) {
              sidebarEl.classList.remove('open');
              menuToggle.setAttribute('aria-expanded', 'false');
            }
          });
        });

        const media = window.matchMedia('(max-width: 900px)');
        const syncMenuState = () => {
          if (!media.matches) {
            sidebarEl.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
          }
        };
        syncMenuState();
        if (media.addEventListener) {
          media.addEventListener('change', syncMenuState);
        } else if (media.addListener) {
          media.addListener(syncMenuState);
        }
      }

      const logoutButton = document.getElementById('logout');
      if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
          await fetch('/api/logout', { method: 'POST' });
          window.location.href = '/login';
        });
      }
    </script>`,
  );
}

export function loginPage(): string {
  return shell(
    "Login",
    `<div style="max-width:460px; margin:64px auto; padding:0 16px;">
      <div class="card stack">
        <h1><i class="fa-solid fa-lock icon icon-primary" aria-hidden="true"></i>Call Center Counter</h1>
        <p class="muted">Sign in to start counting incoming calls.</p>
        <form id="login-form" class="stack">
          <label class="stack">
            <span><i class="fa-solid fa-envelope icon icon-primary" aria-hidden="true"></i>Email</span>
            <input id="email" type="email" required />
          </label>
          <label class="stack">
            <span><i class="fa-solid fa-key icon icon-primary" aria-hidden="true"></i>Password</span>
            <input id="password" type="password" required />
          </label>
          <button class="primary" type="submit"><i class="fa-solid fa-right-to-bracket icon" aria-hidden="true"></i>Sign in</button>
          <div id="error" class="error"></div>
        </form>
      </div>
    </div>`,
    `<script>
      const form = document.getElementById('login-form');
      const error = document.getElementById('error');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        error.textContent = '';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          error.textContent = data.error || 'Invalid credentials';
          return;
        }

        window.location.href = '/app';
      });
    </script>`,
  );
}

export function appPage(userName: string, showInviteLink = false): string {
  return authLayout(
    "Call Counter",
    "app",
    userName,
    `<div class="card row">
      <div>
        <h1><i class="fa-solid fa-house icon icon-primary" aria-hidden="true"></i>Main Counter</h1>
        <p class="muted">Track every incoming call with one click.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card stack">
        <h2><i class="fa-solid fa-calendar-day icon icon-primary" aria-hidden="true"></i>Today</h2>
        <div class="stat" id="today-calls">0</div>
      </div>
      <div class="card stack">
        <h2><i class="fa-solid fa-chart-column icon icon-chart" aria-hidden="true"></i>All time</h2>
        <div class="stat" id="total-calls">0</div>
      </div>
    </div>

    <div class="card stack">
      <p class="muted">Click on every incoming call.</p>
      <button id="increment" class="button-call"><i class="fa-solid fa-plus icon" aria-hidden="true"></i>Add incoming call</button>
      <button id="decrement" class="primary"><i class="fa-solid fa-rotate-left icon" aria-hidden="true"></i>Remove last call</button>
      <div id="increment-error" class="error"></div>
    </div>`,
    `<script>
      async function refreshSummary() {
        const response = await fetch('/api/me');
        if (!response.ok) {
          window.location.href = '/login';
          return;
        }
        const data = await response.json();
        document.getElementById('today-calls').textContent = data.summary.todayCalls;
        document.getElementById('total-calls').textContent = data.summary.totalCalls;
      }

      document.getElementById('increment').addEventListener('click', async () => {
        const incrementError = document.getElementById('increment-error');
        incrementError.textContent = '';
        const response = await fetch('/api/calls/increment', { method: 'POST' });
        if (response.ok) {
          refreshSummary();
          return;
        }

        const data = await response.json().catch(() => ({}));
        incrementError.textContent = data.error || 'Unable to update call counter right now.';
      });

      document.getElementById('decrement').addEventListener('click', async () => {
        const incrementError = document.getElementById('increment-error');
        incrementError.textContent = '';
        const response = await fetch('/api/calls/remove-last', { method: 'POST' });
        if (response.ok) {
          refreshSummary();
          return;
        }

        const data = await response.json().catch(() => ({}));
        incrementError.textContent = data.error || 'Unable to remove the last call right now.';
      });

      refreshSummary();
    </script>`,
    showInviteLink,
  );
}

function chartScripts(scope: "user" | "total", chartId: string, source: "daily" | "weekly", label: string): string {
  return `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      async function loadStats() {
        const response = await fetch('/api/stats?scope=${scope}');
        if (!response.ok) {
          if (response.status === 401) window.location.href = '/login';
          return null;
        }
        return response.json();
      }

      function renderLineChart(canvasId, labels, values, datasetLabel) {
        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        const theme = getComputedStyle(document.documentElement);
        const lineColor = theme.getPropertyValue('--chart-line').trim() || '#60a5fa';
        const gridColor = theme.getPropertyValue('--chart-grid').trim() || '#e2e8f0';
        const textColor = theme.getPropertyValue('--chart-text').trim() || '#4a5568';
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: datasetLabel,
              data: values,
              tension: 0.25,
              fill: false,
              borderColor: lineColor,
              backgroundColor: lineColor,
              pointBackgroundColor: lineColor,
              pointBorderColor: lineColor
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: textColor,
                  boxWidth: isMobile ? 10 : 14,
                  font: { size: isMobile ? 11 : 12 }
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  color: textColor,
                  autoSkip: true,
                  maxTicksLimit: isMobile ? 4 : 8,
                  maxRotation: isMobile ? 0 : 35,
                  font: { size: isMobile ? 10 : 12 }
                },
                grid: { color: gridColor }
              },
              y: {
                beginAtZero: true,
                ticks: {
                  color: textColor,
                  maxTicksLimit: isMobile ? 5 : 8,
                  font: { size: isMobile ? 10 : 12 }
                },
                grid: { color: gridColor }
              }
            }
          }
        });
      }

      (async () => {
        const data = await loadStats();
        if (!data) return;
        const points = data.${source};
        const labels = points.map(item => item.${source === "daily" ? "period" : "year_week"});
        const values = points.map(item => item.count);
        renderLineChart('${chartId}', labels, values, '${label}');
      })();
    </script>`;
}

export function statsWeeklyPage(userName: string, showInviteLink = false): string {
  return authLayout(
    "Weekly Stats",
    "weekly",
    userName,
    `<div class="card stack">
      <h1><i class="fa-solid fa-chart-line icon icon-chart" aria-hidden="true"></i>Weekly Stats</h1>
      <p class="muted">Your calls per day in the last 7 days.</p>
      <canvas id="weeklyChart"></canvas>
    </div>`,
    chartScripts("user", "weeklyChart", "daily", "User calls (last 7 days)"),
    showInviteLink,
  );
}

export function statsMonthlyPage(userName: string, showInviteLink = false): string {
  return authLayout(
    "Monthly Stats",
    "monthly",
    userName,
    `<div class="card stack">
      <h1><i class="fa-solid fa-calendar-days icon icon-primary" aria-hidden="true"></i>Monthly Stats</h1>
      <p class="muted">Your weekly call totals in the last month.</p>
      <canvas id="monthlyChart"></canvas>
    </div>`,
    chartScripts("user", "monthlyChart", "weekly", "User weekly calls (last month)"),
    showInviteLink,
  );
}

export function statsAllTimePage(userName: string, showInviteLink = false): string {
  return authLayout(
    "All-Time Stats",
    "all-time",
    userName,
    `<div class="card stack">
      <h1><i class="fa-solid fa-trophy icon icon-primary" aria-hidden="true"></i>All-Time Stats</h1>
      <p class="muted">Your lifetime performance.</p>
      <div id="allTimeStats" class="metrics-grid"></div>
    </div>`,
    `<script>
      async function loadStats() {
        const response = await fetch('/api/stats?scope=user');
        if (!response.ok) {
          if (response.status === 401) window.location.href = '/login';
          return null;
        }
        return response.json();
      }

      (async () => {
        const data = await loadStats();
        if (!data) return;
        const stats = data.allTime;
        const first = stats.first_call_at ? new Date(stats.first_call_at).toLocaleString() : 'N/A';
        const last = stats.last_call_at ? new Date(stats.last_call_at).toLocaleString() : 'N/A';
        document.getElementById('allTimeStats').innerHTML =
          '<div class="metric-card"><div class="metric-label">Total calls</div><div class="metric-value">' + stats.total_calls + '</div></div>' +
          '<div class="metric-card"><div class="metric-label">Active days</div><div class="metric-value">' + stats.active_days + '</div></div>' +
          '<div class="metric-card"><div class="metric-label">First call</div><div class="metric-value">' + first + '</div></div>' +
          '<div class="metric-card"><div class="metric-label">Last call</div><div class="metric-value">' + last + '</div></div>';
      })();
    </script>`,
    showInviteLink,
  );
}

export function statsTotalPage(userName: string, showInviteLink = false): string {
  return authLayout(
    "Total Stats",
    "total",
    userName,
    `<div class="card stack">
      <h1><i class="fa-solid fa-globe icon icon-primary" aria-hidden="true"></i>Total Stats</h1>
      <p class="muted">Combined stats from all users.</p>
    </div>

    <div class="card stack">
      <h2><i class="fa-solid fa-chart-line icon icon-chart" aria-hidden="true"></i>Daily total (last 7 days)</h2>
      <canvas id="totalDailyChart"></canvas>
    </div>

    <div class="card stack">
      <h2><i class="fa-solid fa-calendar-days icon icon-primary" aria-hidden="true"></i>Weekly total (last month)</h2>
      <canvas id="totalWeeklyChart"></canvas>
    </div>

    <div class="card stack">
      <h2><i class="fa-solid fa-flag-checkered icon icon-primary" aria-hidden="true"></i>Total all-time</h2>
      <div id="totalAllTime" class="metrics-grid"></div>
    </div>`,
    `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      async function loadStats() {
        const response = await fetch('/api/stats?scope=total');
        if (!response.ok) {
          if (response.status === 401) window.location.href = '/login';
          return null;
        }
        return response.json();
      }

      function renderLineChart(canvasId, labels, values, label) {
        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        const theme = getComputedStyle(document.documentElement);
        const lineColor = theme.getPropertyValue('--chart-line').trim() || '#60a5fa';
        const gridColor = theme.getPropertyValue('--chart-grid').trim() || '#e2e8f0';
        const textColor = theme.getPropertyValue('--chart-text').trim() || '#4a5568';
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label,
              data: values,
              tension: 0.25,
              fill: false,
              borderColor: lineColor,
              backgroundColor: lineColor,
              pointBackgroundColor: lineColor,
              pointBorderColor: lineColor
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: textColor,
                  boxWidth: isMobile ? 10 : 14,
                  font: { size: isMobile ? 11 : 12 }
                }
              }
            },
            scales: {
              x: {
                ticks: {
                  color: textColor,
                  autoSkip: true,
                  maxTicksLimit: isMobile ? 4 : 8,
                  maxRotation: isMobile ? 0 : 35,
                  font: { size: isMobile ? 10 : 12 }
                },
                grid: { color: gridColor }
              },
              y: {
                beginAtZero: true,
                ticks: {
                  color: textColor,
                  maxTicksLimit: isMobile ? 5 : 8,
                  font: { size: isMobile ? 10 : 12 }
                },
                grid: { color: gridColor }
              }
            }
          }
        });
      }

      (async () => {
        const data = await loadStats();
        if (!data) return;

        renderLineChart(
          'totalDailyChart',
          data.daily.map(d => d.period),
          data.daily.map(d => d.count),
          'Total daily calls'
        );

        renderLineChart(
          'totalWeeklyChart',
          data.weekly.map(w => w.year_week),
          data.weekly.map(w => w.count),
          'Total weekly calls'
        );

        const first = data.allTime.first_call_at ? new Date(data.allTime.first_call_at).toLocaleString() : 'N/A';
        const last = data.allTime.last_call_at ? new Date(data.allTime.last_call_at).toLocaleString() : 'N/A';
        document.getElementById('totalAllTime').innerHTML =
          '<div class="metric-card"><div class="metric-label">Total calls</div><div class="metric-value">' + data.allTime.total_calls + '</div></div>' +
          '<div class="metric-card"><div class="metric-label">Active days</div><div class="metric-value">' + data.allTime.active_days + '</div></div>' +
          '<div class="metric-card"><div class="metric-label">First call</div><div class="metric-value">' + first + '</div></div>' +
          '<div class="metric-card"><div class="metric-label">Last call</div><div class="metric-value">' + last + '</div></div>';
      })();
    </script>`,
    showInviteLink,
  );
}

export function inviteGeneratorPage(userName: string, showInviteLink = false): string {
  return authLayout(
    "Invite Signup",
    "invites",
    userName,
    `<div class="card stack">
      <h1><i class="fa-solid fa-link icon icon-primary" aria-hidden="true"></i>Create signup link</h1>
      <p class="muted">Generate a 5-day invite URL for one email.</p>
      <form id="invite-form" class="stack" style="max-width:520px;">
        <label class="stack">
          <span><i class="fa-solid fa-envelope icon icon-primary" aria-hidden="true"></i>Email</span>
          <input id="invite-email" type="email" required />
        </label>
        <button class="primary" type="submit">Generate link</button>
      </form>
      <div id="invite-error" class="error"></div>
      <label class="stack" for="invite-url">
        <span>Invite URL</span>
        <input id="invite-url" type="text" readonly />
      </label>
    </div>`,
    `<script>
      const form = document.getElementById('invite-form');
      const errorEl = document.getElementById('invite-error');
      const inviteUrlInput = document.getElementById('invite-url');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorEl.textContent = '';
        inviteUrlInput.value = '';

        const email = document.getElementById('invite-email').value.trim();
        const response = await fetch('/api/admin/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          errorEl.textContent = data.error || 'Could not create invite link.';
          return;
        }

        const data = await response.json();
        inviteUrlInput.value = data.inviteUrl;
      });
    </script>`,
    showInviteLink,
  );
}

export function inviteVerifyEmailPage(token: string): string {
  return shell(
    "Verify Invite Email",
    `<div style="max-width:460px; margin:64px auto; padding:0 16px;">
      <div class="card stack">
        <h1><i class="fa-solid fa-circle-check icon icon-primary" aria-hidden="true"></i>Verify your email</h1>
        <p class="muted">Enter the email this invite was sent to.</p>
        <form id="verify-form" class="stack">
          <label class="stack">
            <span><i class="fa-solid fa-envelope icon icon-primary" aria-hidden="true"></i>Email</span>
            <input id="email" type="email" required />
          </label>
          <button class="primary" type="submit">Continue</button>
          <div id="error" class="error"></div>
        </form>
      </div>
    </div>`,
    `<script>
      const token = ${JSON.stringify(token)};
      const form = document.getElementById('verify-form');
      const error = document.getElementById('error');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        error.textContent = '';
        const email = document.getElementById('email').value.trim();

        const response = await fetch('/api/signup/verify-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          error.textContent = data.error || 'Could not verify invite email.';
          return;
        }

        const data = await response.json();
        window.location.href = data.redirectTo;
      });
    </script>`,
  );
}

export function inviteSignupPage(token: string, email: string): string {
  return shell(
    "Complete Signup",
    `<div style="max-width:460px; margin:64px auto; padding:0 16px;">
      <div class="card stack">
        <h1><i class="fa-solid fa-user-plus icon icon-primary" aria-hidden="true"></i>Complete your signup</h1>
        <p class="muted">Finish setting up your account.</p>
        <form id="signup-form" class="stack">
          <label class="stack">
            <span><i class="fa-solid fa-envelope icon icon-primary" aria-hidden="true"></i>Email</span>
            <input id="email" type="email" value="${email}" readonly />
          </label>
          <label class="stack">
            <span><i class="fa-solid fa-user icon icon-primary" aria-hidden="true"></i>First name</span>
            <input id="first-name" type="text" required />
          </label>
          <label class="stack">
            <span><i class="fa-solid fa-user icon icon-primary" aria-hidden="true"></i>Last name</span>
            <input id="last-name" type="text" required />
          </label>
          <label class="stack">
            <span><i class="fa-solid fa-key icon icon-primary" aria-hidden="true"></i>Password</span>
            <input id="password" type="password" minlength="8" required />
          </label>
          <button class="primary" type="submit">Create account</button>
          <div id="error" class="error"></div>
        </form>
      </div>
    </div>`,
    `<script>
      const token = ${JSON.stringify(token)};
      const form = document.getElementById('signup-form');
      const error = document.getElementById('error');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        error.textContent = '';

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const password = document.getElementById('password').value;

        const response = await fetch('/api/signup/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, firstName, lastName, password })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          error.textContent = data.error || 'Could not create account.';
          return;
        }

        window.location.href = '/login';
      });
    </script>`,
  );
}

export function inviteInvalidPage(message: string): string {
  return shell(
    "Invalid Invite",
    `<div style="max-width:460px; margin:64px auto; padding:0 16px;">
      <div class="card stack">
        <h1><i class="fa-solid fa-triangle-exclamation icon icon-error" aria-hidden="true"></i>Invite unavailable</h1>
        <p class="muted">${message}</p>
        <a href="/login">Back to login</a>
      </div>
    </div>`,
  );
}
