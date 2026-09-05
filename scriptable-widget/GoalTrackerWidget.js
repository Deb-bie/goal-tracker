// Goal Tracker — iOS/iPadOS home screen widget
//
// This runs inside Scriptable (free, App Store: https://apps.apple.com/app/scriptable/id1405459188).
// It is NOT part of the Next.js/FastAPI app — it's a separate small script that
// turns your deployed backend's /analytics/summary endpoint into a real,
// glanceable home-screen widget. A web app cannot create a native iOS widget
// on its own; Scriptable is the standard workaround for exactly this.
//
// SETUP (one-time):
//   1. Install Scriptable from the App Store.
//   2. Create a new script in Scriptable, paste this whole file in, name it
//      "Goal Tracker".
//   3. Tap the ▶️ Run button inside the Scriptable app (not as a widget yet).
//      It will ask for your API URL, email, and password once, then store a
//      login token securely in the iOS Keychain.
//   4. Long-press your home screen → add a widget → search "Scriptable" →
//      choose the small or medium size → edit the widget → set "Script" to
//      "Goal Tracker".
//
// Your backend must be reachable from your phone — i.e. deployed (Render/
// Railway/Vercel/etc.), not just running on localhost. See the main
// README.md for deployment notes.

const KEYCHAIN_API_URL = "goal_tracker_api_url";
const KEYCHAIN_TOKEN = "goal_tracker_token";
const KEYCHAIN_EMAIL = "goal_tracker_email";

const BRAND_START = "#2563eb";
const BRAND_END = "#9333ea";

async function promptForCredentials() {
  const alert = new Alert();
  alert.title = "Connect Goal Tracker";
  alert.message = "Enter your backend URL and login. This is stored securely on this device only.";
  alert.addTextField("API URL (e.g. https://api.yourapp.com)", Keychain.contains(KEYCHAIN_API_URL) ? Keychain.get(KEYCHAIN_API_URL) : "");
  alert.addTextField("Email");
  alert.addSecureTextField("Password");
  alert.addAction("Save & Connect");
  alert.addCancelAction("Cancel");

  const idx = await alert.present();
  if (idx === -1) return null;

  const apiUrl = alert.textFieldValue(0).replace(/\/$/, "");
  const email = alert.textFieldValue(1);
  const password = alert.textFieldValue(2);
  return { apiUrl, email, password };
}

async function login(apiUrl, email, password) {
  const req = new Request(`${apiUrl}/auth/login/json`);
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({ email, password });
  const res = await req.loadJSON();
  if (!res.access_token) throw new Error(res.detail || "Login failed");
  return res.access_token;
}

async function fetchSummary(apiUrl, token) {
  const req = new Request(`${apiUrl}/analytics/summary?period=daily`);
  req.headers = { Authorization: `Bearer ${token}` };
  const res = await req.loadJSON();
  if (req.response.statusCode === 401) throw { unauthorized: true };
  if (req.response.statusCode >= 400) throw new Error(res.detail || "Request failed");
  return res;
}

async function ensureAuth(runningInWidget) {
  let apiUrl = Keychain.contains(KEYCHAIN_API_URL) ? Keychain.get(KEYCHAIN_API_URL) : null;
  let token = Keychain.contains(KEYCHAIN_TOKEN) ? Keychain.get(KEYCHAIN_TOKEN) : null;

  if ((!apiUrl || !token) && runningInWidget) {
    return null; // Can't show interactive prompts inside a placed widget.
  }
  if (!apiUrl || !token) {
    const creds = await promptForCredentials();
    if (!creds) return null;
    token = await login(creds.apiUrl, creds.email, creds.password);
    Keychain.set(KEYCHAIN_API_URL, creds.apiUrl);
    Keychain.set(KEYCHAIN_TOKEN, token);
    Keychain.set(KEYCHAIN_EMAIL, creds.email);
    apiUrl = creds.apiUrl;
  }
  return { apiUrl, token };
}

function gradient() {
  const g = new LinearGradient();
  g.locations = [0, 1];
  g.colors = [new Color(BRAND_START), new Color(BRAND_END)];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 1);
  return g;
}

function buildWidget(summary, family) {
  const w = new ListWidget();
  w.backgroundGradient = gradient();
  w.setPadding(16, 16, 16, 16);

  const header = w.addStack();
  const title = header.addText("🎯 Today");
  title.font = Font.boldSystemFont(14);
  title.textColor = Color.white();
  header.addSpacer();
  const streak = header.addText(summary.current_streak_days > 0 ? `🔥 ${summary.current_streak_days}d` : "");
  streak.font = Font.boldSystemFont(13);
  streak.textColor = Color.white();

  w.addSpacer(10);

  const rate = w.addText(`${summary.completion_rate}%`);
  rate.font = Font.boldSystemFont(34);
  rate.textColor = Color.white();

  const sub = w.addText(`${summary.todos_completed}/${summary.todos_due} todos done`);
  sub.font = Font.systemFont(12);
  sub.textColor = new Color("#ffffff", 0.85);

  if (family !== "small" && summary.goal_progress && summary.goal_progress.length > 0) {
    w.addSpacer(12);
    const goalsToShow = summary.goal_progress.slice(0, 3);
    for (const g of goalsToShow) {
      const row = w.addStack();
      row.centerAlignContent();
      const label = row.addText(g.title.length > 22 ? g.title.slice(0, 21) + "…" : g.title);
      label.font = Font.systemFont(11);
      label.textColor = Color.white();
      row.addSpacer();
      const pct = row.addText(`${g.progress_pct}%`);
      pct.font = Font.boldSystemFont(11);
      pct.textColor = Color.white();
      w.addSpacer(4);
    }
  }

  w.addSpacer();
  const footer = w.addText(`${summary.range_start}`);
  footer.font = Font.systemFont(9);
  footer.textColor = new Color("#ffffff", 0.6);

  return w;
}

function errorWidget(message) {
  const w = new ListWidget();
  w.backgroundGradient = gradient();
  w.setPadding(16, 16, 16, 16);
  const t = w.addText("🎯 Goal Tracker");
  t.font = Font.boldSystemFont(13);
  t.textColor = Color.white();
  w.addSpacer(6);
  const m = w.addText(message);
  m.font = Font.systemFont(11);
  m.textColor = new Color("#ffffff", 0.9);
  return w;
}

async function main() {
  const runningInWidget = config.runsInWidget;

  try {
    let auth = await ensureAuth(runningInWidget);
    if (!auth) {
      const w = errorWidget("Open Scriptable and run this script once to log in.");
      if (runningInWidget) { Script.setWidget(w); }
      Script.complete();
      return;
    }

    let summary;
    try {
      summary = await fetchSummary(auth.apiUrl, auth.token);
    } catch (err) {
      if (err && err.unauthorized && !runningInWidget) {
        // Token expired — re-login interactively (only possible outside a widget).
        const email = Keychain.contains(KEYCHAIN_EMAIL) ? Keychain.get(KEYCHAIN_EMAIL) : "";
        const alert = new Alert();
        alert.title = "Session expired";
        alert.message = `Log back in as ${email}`;
        alert.addSecureTextField("Password");
        alert.addAction("Log in");
        alert.addCancelAction("Cancel");
        const idx = await alert.present();
        if (idx === -1) throw new Error("Login required");
        const token = await login(auth.apiUrl, email, alert.textFieldValue(0));
        Keychain.set(KEYCHAIN_TOKEN, token);
        summary = await fetchSummary(auth.apiUrl, token);
      } else {
        throw err;
      }
    }

    const family = config.widgetFamily || "medium";
    const widget = buildWidget(summary, family);

    if (runningInWidget) {
      Script.setWidget(widget);
    } else {
      await widget.presentMedium();
    }
  } catch (err) {
    const w = errorWidget(`Couldn't load: ${err.message || err}`);
    if (runningInWidget) {
      Script.setWidget(w);
    } else {
      await w.presentMedium();
    }
  }
  Script.complete();
}

await main();
