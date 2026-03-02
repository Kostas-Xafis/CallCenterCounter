function layout(title: string, body: string, extraScripts = ""): string {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #f7fafc; color: #1a202c; }
    .container { max-width: 920px; margin: 0 auto; padding: 24px; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.08); padding: 20px; }
    .stack { display: grid; gap: 12px; }
    .row { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
    .muted { color: #4a5568; }
    h1, h2 { margin: 0; }
    input { padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e0; width: 100%; }
    button { border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-weight: 600; }
    button.primary { background: #2b6cb0; color: #fff; }
    button.secondary { background: #edf2f7; color: #1a202c; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat { font-size: 30px; font-weight: 700; }
    .error { color: #c53030; min-height: 1em; }
    a { color: #2b6cb0; text-decoration: none; }
    @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">${body}</div>
  ${extraScripts}
</body>
</html>`;
}

export function loginPage(): string {
    return layout(
        "Login",
        `<div class="card stack" style="max-width: 460px; margin: 64px auto;">
      <h1>Call Center Counter</h1>
      <p class="muted">Sign in to start counting incoming calls.</p>
      <form id="login-form" class="stack">
        <label class="stack">
          <span>Email</span>
          <input id="email" type="email" required />
        </label>
        <label class="stack">
          <span>Password</span>
          <input id="password" type="password" required />
        </label>
        <button class="primary" type="submit">Sign in</button>
        <div id="error" class="error"></div>
      </form>
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

export function appPage(userEmail: string): string {
    return layout(
        "Call Counter",
        `<div class="stack">
      <div class="card row">
        <div>
          <h1>Main Counter</h1>
          <p class="muted">Signed in as ${userEmail}</p>
        </div>
        <div class="row">
          <a href="/stats">View stats</a>
          <button id="logout" class="secondary">Logout</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card stack">
          <h2>Today</h2>
          <div class="stat" id="today-calls">0</div>
        </div>
        <div class="card stack">
          <h2>All time</h2>
          <div class="stat" id="total-calls">0</div>
        </div>
      </div>

      <div class="card stack">
        <p class="muted">Click the button on every incoming call.</p>
        <button id="increment" class="primary">+1 Incoming call</button>
        <div id="increment-error" class="error"></div>
      </div>
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

      document.getElementById('logout').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
      });

      refreshSummary();
    </script>`,
    );
}

export function statsPage(userEmail: string): string {
    return layout(
        "Stats",
        `<div class="stack">
      <div class="card row">
        <div>
          <h1>Statistics</h1>
          <p class="muted">${userEmail}</p>
        </div>
        <div class="row">
          <a href="/app">Back to counter</a>
          <button id="logout" class="secondary">Logout</button>
        </div>
      </div>

      <div class="card stack">
        <h2>Your calls per day (last 7 days)</h2>
        <canvas id="userDailyChart"></canvas>
      </div>

      <div class="card stack">
        <h2>Your weekly calls (last month)</h2>
        <canvas id="userWeeklyChart"></canvas>
      </div>

      <div class="card stack">
        <h2>Your all-time stats</h2>
        <div id="userAllTime" class="muted"></div>
      </div>

      <div class="card stack">
        <h2>Total calls per day (last 7 days)</h2>
        <canvas id="totalDailyChart"></canvas>
      </div>

      <div class="card stack">
        <h2>Total weekly calls (last month)</h2>
        <canvas id="totalWeeklyChart"></canvas>
      </div>

      <div class="card stack">
        <h2>Total all-time stats</h2>
        <div id="totalAllTime" class="muted"></div>
      </div>
    </div>`,
        `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      function renderLineChart(canvasId, labels, values, label) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{ label, data: values, tension: 0.25, fill: false }]
          },
          options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
          }
        });
      }

      function renderAllTime(elementId, stats) {
        const first = stats.first_call_at ? new Date(stats.first_call_at).toLocaleString() : 'N/A';
        const last = stats.last_call_at ? new Date(stats.last_call_at).toLocaleString() : 'N/A';
        document.getElementById(elementId).innerHTML =
          'Total calls: <strong>' + stats.total_calls + '</strong><br/>' +
          'Active days: <strong>' + stats.active_days + '</strong><br/>' +
          'First call: <strong>' + first + '</strong><br/>' +
          'Last call: <strong>' + last + '</strong>';
      }

      async function loadScope(scope) {
        const response = await fetch('/api/stats?scope=' + scope);
        if (!response.ok) {
          if (response.status === 401) window.location.href = '/login';
          return null;
        }
        return response.json();
      }

      (async () => {
        const user = await loadScope('user');
        const total = await loadScope('total');
        if (!user || !total) return;

        renderLineChart('userDailyChart', user.daily.map(d => d.period), user.daily.map(d => d.count), 'User daily calls');
        renderLineChart('userWeeklyChart', user.weekly.map(w => w.year_week), user.weekly.map(w => w.count), 'User weekly calls');
        renderAllTime('userAllTime', user.allTime);

        renderLineChart('totalDailyChart', total.daily.map(d => d.period), total.daily.map(d => d.count), 'Total daily calls');
        renderLineChart('totalWeeklyChart', total.weekly.map(w => w.year_week), total.weekly.map(w => w.count), 'Total weekly calls');
        renderAllTime('totalAllTime', total.allTime);
      })();

      document.getElementById('logout').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
      });
    </script>`,
    );
}
