import { a as attr, b as bind_props, e as ensure_array_like, c as attr_class, s as store_get, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { o as onDestroy } from "../../../chunks/index-server.js";
import { g as goto } from "../../../chunks/client.js";
import { p as page } from "../../../chunks/stores.js";
import { C as Card } from "../../../chunks/Card.js";
import { a as session } from "../../../chunks/auth.js";
import { p as pushToast } from "../../../chunks/toast.js";
import "clsx";
import { e as escape_html } from "../../../chunks/escaping.js";
import { Z as fallback } from "../../../chunks/utils2.js";
import { a as apiFetch } from "../../../chunks/api.js";
import { w as writable } from "../../../chunks/index.js";
function AdminHeader($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let lastUpdatedAt = fallback($$props["lastUpdatedAt"], "");
    let loading = fallback($$props["loading"], false);
    let onRefresh = fallback($$props["onRefresh"], null);
    $$renderer2.push(`<div class="dashboard-head svelte-7s3hde"><p class="text-muted">Letzte Aktualisierung: ${escape_html(lastUpdatedAt || "-")}</p> <button class="btn btn-outline" type="button"${attr("disabled", loading, true)}>${escape_html(loading ? "Lade..." : "Aktualisieren")}</button></div>`);
    bind_props($$props, { lastUpdatedAt, loading, onRefresh });
  });
}
function AdminStats($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let stats = fallback($$props["stats"], null);
    let loading = fallback($$props["loading"], false);
    const formatNumber = (value) => new Intl.NumberFormat("de-DE").format(Number.isFinite(Number(value)) ? Number(value) : 0);
    const formatUptime = (seconds) => {
      const safe = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
      const days = Math.floor(safe / 86400);
      const hours = Math.floor(safe % 86400 / 3600);
      const minutes = Math.floor(safe % 3600 / 60);
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    };
    const bytesToMb = (bytes) => {
      const safe = Number.isFinite(Number(bytes)) ? Math.max(0, Number(bytes)) : 0;
      return `${(safe / (1024 * 1024)).toFixed(1)} MB`;
    };
    $$renderer2.push(`<section class="section-block svelte-1rofc7m"><h2 class="section-title svelte-1rofc7m">System Overview</h2> `);
    if (loading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="stats-grid svelte-1rofc7m"><!--[-->`);
      const each_array = ensure_array_like(Array(8));
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        each_array[i];
        Card($$renderer2, {
          title: "Lade...",
          children: ($$renderer3) => {
            $$renderer3.push(`<div class="skeleton-value svelte-1rofc7m"></div> <div class="skeleton-sub svelte-1rofc7m"></div>`);
          },
          $$slots: { default: true }
        });
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="stats-grid svelte-1rofc7m">`);
      Card($$renderer2, {
        title: "Total Users",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="stat-value svelte-1rofc7m">${escape_html(formatNumber(stats?.totalUsers))}</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Active Sessions",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="stat-value svelte-1rofc7m">${escape_html(formatNumber(stats?.activeSessions))}</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Events",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="stat-value svelte-1rofc7m">${escape_html(formatNumber(stats?.totalEvents))}</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Chat Messages Today",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="stat-value svelte-1rofc7m">${escape_html(formatNumber(stats?.messagesToday))}</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Server Uptime",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="stat-value svelte-1rofc7m">${escape_html(formatUptime(stats?.serverUptime))}</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Memory Usage",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="stat-value svelte-1rofc7m">${escape_html(bytesToMb(stats?.memoryUsage?.heapUsed))}</p> <p class="text-muted svelte-1rofc7m">Heap Used</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "App Version",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="stat-value svelte-1rofc7m">${escape_html(stats?.appVersion || "dev")}</p> <p class="text-muted svelte-1rofc7m">Commit: ${escape_html(stats?.gitCommit || "dev")}</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----> `);
      Card($$renderer2, {
        title: "Total Chat Messages",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="stat-value svelte-1rofc7m">${escape_html(formatNumber(stats?.totalChatMessages))}</p>`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]--></section>`);
    bind_props($$props, { stats, loading });
  });
}
function AdminUserManagement($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const roleOptions = [
      { value: "alle", label: "Alle Rollen" },
      { value: "admin", label: "Admin" },
      { value: "materialwart", label: "Materialwart" },
      { value: "user", label: "Nutzer" }
    ];
    let users = [];
    let roleFilter = "alle";
    let search = "";
    users.filter((user) => {
      if (!search.trim()) return true;
      const needle = search.trim().toLowerCase();
      return user.email.toLowerCase().includes(needle);
    });
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">User Management</h2> `);
    Card($$renderer2, {
      title: "Benutzeranfragen",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Anfragen...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Benutzerverwaltung",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="toolbar svelte-1t40esv"><input class="input" placeholder="Suche nach Nutzername"${attr("value", search)}/> `);
        $$renderer3.select({ value: roleFilter }, ($$renderer4) => {
          $$renderer4.push(`<!--[-->`);
          const each_array_1 = ensure_array_like(roleOptions);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let option = each_array_1[$$index_1];
            $$renderer4.option({ value: option.value }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(option.label)}`);
            });
          }
          $$renderer4.push(`<!--]-->`);
        });
        $$renderer3.push(`</div> `);
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Benutzer...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section>`);
  });
}
function AdminSidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let tabs = fallback($$props["tabs"], () => [], true);
    let activeTab = fallback($$props["activeTab"], "overview");
    let onSelect = fallback($$props["onSelect"], null);
    $$renderer2.push(`<aside class="admin-sidebar svelte-6rrwnf"><nav class="admin-sidebar__nav svelte-6rrwnf" aria-label="Admin Navigation"><!--[-->`);
    const each_array = ensure_array_like(tabs);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let tab = each_array[$$index];
      $$renderer2.push(`<button type="button"${attr_class(`admin-sidebar__item ${activeTab === tab.id ? "is-active" : ""}`, "svelte-6rrwnf")}>${escape_html(tab.label)}</button>`);
    }
    $$renderer2.push(`<!--]--></nav></aside>`);
    bind_props($$props, { tabs, activeTab, onSelect });
  });
}
function AdminTopBar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let title = fallback($$props["title"], "Admin");
    let subtitle = fallback($$props["subtitle"], "");
    let onRefresh = fallback($$props["onRefresh"], null);
    $$renderer2.push(`<header class="admin-topbar svelte-1qt4vx7"><div><h2 class="section-title">${escape_html(title)}</h2> `);
    if (subtitle) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-muted">${escape_html(subtitle)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <button class="btn btn-outline" type="button">Aktualisieren</button></header>`);
    bind_props($$props, { title, subtitle, onRefresh });
  });
}
function AdminOverview($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let stats = null;
    let loading = true;
    let lastUpdatedAt = "";
    const loadStats = async (showErrorToast = true) => {
      try {
        const data = await apiFetch("/api/admin/stats", { toastOnError: false });
        stats = data;
        lastUpdatedAt = (/* @__PURE__ */ new Date()).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      } catch (error) {
        if (showErrorToast) {
          pushToast(
            error instanceof Error ? error.message : "Admin-Statistiken konnten nicht geladen werden.",
            "error"
          );
        }
      } finally {
        loading = false;
      }
    };
    const refresh = async () => {
      await loadStats();
    };
    onDestroy(() => {
    });
    $$renderer2.push(`<section class="section-block">`);
    AdminHeader($$renderer2, { lastUpdatedAt, loading, onRefresh: () => void loadStats() });
    $$renderer2.push(`<!----> `);
    AdminStats($$renderer2, { stats, loading });
    $$renderer2.push(`<!----></section>`);
    bind_props($$props, { refresh });
  });
}
function AdminObservability($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const trackedMetrics = [
      { key: "api.p95_latency_ms", label: "API p95 (ms)" },
      { key: "api.error_rate", label: "API Fehlerquote (%)" },
      { key: "ws.messages_per_sec", label: "WS msg/s" },
      { key: "db.slow_queries", label: "DB Slow Queries" },
      { key: "system.cpu_load_1m", label: "CPU Load 1m" },
      { key: "system.ram_used_mb", label: "RAM Used (MB)" }
    ];
    const investigateTarget = (metric) => {
      if (metric.startsWith("api.")) return "/admin?tab=api-heatmap";
      if (metric.startsWith("ws.")) return "/admin?tab=websocket";
      if (metric.startsWith("db.")) return "/admin?tab=database";
      if (metric.startsWith("queue.")) return "/admin?tab=queue";
      if (metric.startsWith("redis.")) return "/admin?tab=redis";
      return "/admin?tab=errors";
    };
    let loading = true;
    let series = /* @__PURE__ */ new Map();
    let alerts = [];
    let testingAlerts = false;
    let downloadLoading = false;
    const pointsToPath = (points) => {
      if (points.length === 0) return "";
      const width = 280;
      const height = 64;
      const values = points.map((point) => point.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || 1;
      return points.map((point, index) => {
        const x = index / Math.max(1, points.length - 1) * width;
        const y = height - (point.value - min) / span * height;
        return `${x},${y}`;
      }).join(" ");
    };
    const fmtNumber = (value) => Number(0).toFixed(2);
    onDestroy(() => {
    });
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Observability</h2> <div class="actions"><button class="btn btn-outline" type="button"${attr("disabled", loading, true)}>Aktualisieren</button> <button class="btn btn-outline" type="button"${attr("disabled", testingAlerts, true)}>${escape_html("Alerts testen")}</button> <button class="btn btn-outline" type="button"${attr("disabled", downloadLoading, true)}>Report JSON</button> <button class="btn btn-outline" type="button"${attr("disabled", downloadLoading, true)}>Report CSV</button> <button class="btn btn-primary" type="button">Alert erstellen</button></div> <div class="grid-3">`);
    Card($$renderer2, {
      title: "API Request Count",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "API p95",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(fmtNumber())} ms`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "API Error Rate",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(fmtNumber())} %`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "WS Clients",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "WS Msg/s",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(fmtNumber())}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "WS Dropped",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Queue Throughput",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(fmtNumber())}/min`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "DB Slow Queries",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "System CPU Load",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(fmtNumber())}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    Card($$renderer2, {
      title: "Timeseries",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="chart-grid svelte-1uys780"><!--[-->`);
        const each_array = ensure_array_like(trackedMetrics);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let metric = each_array[$$index];
          $$renderer3.push(`<div class="mini-chart svelte-1uys780"><div class="mini-chart__title svelte-1uys780">${escape_html(metric.label)}</div> <svg viewBox="0 0 280 64" preserveAspectRatio="none"${attr("aria-label", metric.label)} class="svelte-1uys780"><polyline${attr("points", pointsToPath(series.get(metric.key) ?? []))} fill="none" stroke="var(--color-primary)" stroke-width="2"></polyline></svg></div>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Alerts",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Metric</th><th>Threshold</th><th>Letzter Trigger</th><th>Investigate</th></tr></thead><tbody>`);
        if (alerts.length === 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<tr><td colspan="5" class="text-muted">Keine Alerts.</td></tr>`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<!--[-->`);
          const each_array_1 = ensure_array_like(alerts);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let alert = each_array_1[$$index_1];
            $$renderer3.push(`<tr><td>${escape_html(alert.name)}</td><td>${escape_html(alert.metric)}</td><td>${escape_html(alert.operator)} ${escape_html(alert.threshold)}</td><td>${escape_html(alert.last_triggered_at ? new Date(alert.last_triggered_at).toLocaleString("de-DE") : "-")}</td><td><a${attr("href", investigateTarget(alert.metric))}>Öffnen</a></td></tr>`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--></tbody></table></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function AdminSystemMonitor($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const toMb = (value) => `${((Number(0) || 0) / (1024 * 1024)).toFixed(1)} MB`;
    const uptime = (seconds) => {
      const s = Math.max(0, Math.floor(Number(0)));
      const h = Math.floor(s / 3600);
      const m = Math.floor(s % 3600 / 60);
      return `${h}h ${m}m`;
    };
    onDestroy(() => {
    });
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Live System Monitor</h2> <div class="grid-2">`);
    Card($$renderer2, {
      title: "CPU Usage",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-1pk13lw">${escape_html(0 .toFixed(2))}%</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Memory Usage",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-1pk13lw">${escape_html(toMb())}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Uptime",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-1pk13lw">${escape_html(uptime())}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Active Connections",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-1pk13lw">${escape_html(0)}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-muted">Lade Systemdaten...</p>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function AdminJobs($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Background Job Dashboard</h2> `);
    Card($$renderer2, {
      title: "Cron Jobs",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Jobs...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section>`);
  });
}
function AdminDocker($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Docker Status</h2> `);
    Card($$renderer2, {
      title: "Container",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Containerstatus...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section>`);
  });
}
function AdminWebSocket($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const fmt = (iso) => "-";
    onDestroy(() => {
    });
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">WebSocket Monitor</h2> <div class="grid-2">`);
    Card($$renderer2, {
      title: "Connected Clients",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-1c1y0p2">${escape_html(0)}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Online Users",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-1c1y0p2">${escape_html(0)}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Messages / Minute",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-1c1y0p2">${escape_html(0)}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Last Broadcast",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-1c1y0p2">${escape_html("-")}</p> <p class="text-muted">${escape_html(fmt())}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-muted">Lade WebSocket-Daten...</p>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function AdminFeatureFlags($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Feature Flags</h2> `);
    Card($$renderer2, {
      title: "Feature Toggle Panel",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Flags...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section>`);
  });
}
function AdminDatabaseHealth($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const toMb = (bytes) => `${((Number(0) || 0) / (1024 * 1024)).toFixed(2)} MB`;
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Database Health</h2> <div class="grid-2">`);
    Card($$renderer2, {
      title: "Connection Status",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-7mge44">${escape_html("-")}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Active Connections",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-7mge44">${escape_html(0)}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "DB Size",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-7mge44">${escape_html(toMb())}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Slow Query Count",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-7mge44">${escape_html(0)}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Migration Version",
      children: ($$renderer3) => {
        $$renderer3.push(`<p class="stat-value svelte-7mge44">${escape_html("-")}</p>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-muted">Lade DB-Health...</p>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function AdminAuditLogs($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let exporting = false;
    let user = "";
    let action = "";
    let search = "";
    let dateFrom = "";
    let dateTo = "";
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Audit Log Viewer</h2> `);
    Card($$renderer2, {
      title: "Filter",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="form-grid grid-3"><label><span>User</span> <input class="input"${attr("value", user)} placeholder="z. B. admin@"/></label> <label><span>Action</span> <input class="input"${attr("value", action)} placeholder="z. B. admin.user"/></label> <label><span>Search</span> <input class="input"${attr("value", search)} placeholder="Metadata durchsuchen"/></label> <label><span>Von</span> <input class="input" type="date"${attr("value", dateFrom)}/></label> <label><span>Bis</span> <input class="input" type="date"${attr("value", dateTo)}/></label></div> <div class="actions"><button class="btn btn-outline" type="button">Filter anwenden</button> <button class="btn btn-primary" type="button"${attr("disabled", exporting, true)}>${escape_html("Export JSON")}</button></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Audit Logs",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Logs...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section>`);
  });
}
class AdminWsClient {
  socket = null;
  reconnectTimer = null;
  pingTimer = null;
  reconnectAttempt = 0;
  listeners = /* @__PURE__ */ new Set();
  subscriptions = /* @__PURE__ */ new Map();
  clearTimers() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
  scheduleReconnect() {
    return;
  }
  send(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }
  syncSubscriptions() {
    for (const [channel, filters] of this.subscriptions) {
      this.send({ type: "subscribe", channel, filters });
    }
  }
  connect() {
    return;
  }
  disconnectIfIdle() {
    if (this.subscriptions.size > 0) return;
    this.clearTimers();
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
      }
      this.socket = null;
    }
  }
  subscribe(channel, filters = {}) {
    this.subscriptions.set(channel, filters);
    this.connect();
    this.send({ type: "subscribe", channel, filters });
  }
  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    this.send({ type: "unsubscribe", channel });
    this.disconnectIfIdle();
  }
  onMessage(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
const adminWsClient = new AdminWsClient();
const adminLogsStore = writable([]);
const adminErrorsStore = writable([]);
const adminQueueStore = writable(null);
const adminDockerStore = writable(null);
const adminRedisStore = writable(null);
const adminApiMetricsStore = writable(null);
let listenerBound = false;
let listenerCleanup = null;
const channelRefCount = /* @__PURE__ */ new Map();
const bindListener = () => {
  if (listenerBound) return;
  listenerBound = true;
  listenerCleanup = adminWsClient.onMessage((message) => {
    if (message.type !== "event" && message.type !== "snapshot") return;
    if (message.channel === "logs") {
      const payload = message.data;
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (message.type === "snapshot") {
        adminLogsStore.set(items);
      } else {
        adminLogsStore.update((prev) => [...prev, ...items.length ? items : [message.data]].slice(-1e3));
      }
      return;
    }
    if (message.channel === "errors") {
      const payload = message.data;
      if (message.type === "snapshot") {
        adminErrorsStore.set(Array.isArray(payload.items) ? payload.items : []);
      } else {
        adminErrorsStore.update((prev) => [message.data, ...prev].slice(0, 500));
      }
      return;
    }
    if (message.channel === "queue") {
      adminQueueStore.set(message.data);
      return;
    }
    if (message.channel === "docker") {
      adminDockerStore.set(message.data);
      return;
    }
    if (message.channel === "redis") {
      adminRedisStore.set(message.data);
      return;
    }
    if (message.channel === "api-metrics") {
      adminApiMetricsStore.set(message.data);
    }
  });
};
const maybeUnbindListener = () => {
  const totalRefs = Array.from(channelRefCount.values()).reduce((sum, count) => sum + count, 0);
  if (totalRefs > 0) return;
  listenerCleanup?.();
  listenerCleanup = null;
  listenerBound = false;
};
const subscribeAdminChannel = (channel, filters = {}) => {
  bindListener();
  const current = channelRefCount.get(channel) ?? 0;
  channelRefCount.set(channel, current + 1);
  if (current === 0) {
    adminWsClient.subscribe(channel, filters);
  } else if (current > 0 && Object.keys(filters).length > 0) {
    adminWsClient.subscribe(channel, filters);
  }
  return () => {
    const count = channelRefCount.get(channel) ?? 0;
    const next = Math.max(0, count - 1);
    if (next === 0) {
      channelRefCount.delete(channel);
      adminWsClient.unsubscribe(channel);
    } else {
      channelRefCount.set(channel, next);
    }
    maybeUnbindListener();
  };
};
function AdminLogStream($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let logs = [];
    let minLevel = "info";
    let autoScroll = true;
    let mounted = false;
    let unsubscribeChannel = null;
    const levelFilter = () => {
      return ["info", "warn", "error", "fatal"];
    };
    const resubscribe = () => {
      unsubscribeChannel?.();
      unsubscribeChannel = subscribeAdminChannel("logs", { level: levelFilter() });
    };
    onDestroy(() => {
      mounted = false;
      unsubscribeChannel?.();
    });
    if (mounted) {
      resubscribe();
    }
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Real-time Log Stream</h2> `);
    Card($$renderer2, {
      title: "Log Stream",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="actions"><button class="btn btn-outline" type="button">${escape_html("Pause")}</button> <label><span class="text-muted">Level</span> `);
        $$renderer3.select({ value: minLevel }, ($$renderer4) => {
          $$renderer4.option({ value: "trace" }, ($$renderer5) => {
            $$renderer5.push(`trace`);
          });
          $$renderer4.option({ value: "debug" }, ($$renderer5) => {
            $$renderer5.push(`debug`);
          });
          $$renderer4.option({ value: "info" }, ($$renderer5) => {
            $$renderer5.push(`info`);
          });
          $$renderer4.option({ value: "warn" }, ($$renderer5) => {
            $$renderer5.push(`warn`);
          });
          $$renderer4.option({ value: "error" }, ($$renderer5) => {
            $$renderer5.push(`error`);
          });
          $$renderer4.option({ value: "fatal" }, ($$renderer5) => {
            $$renderer5.push(`fatal`);
          });
        });
        $$renderer3.push(`</label> <label class="toggle-inline"><input type="checkbox"${attr("checked", autoScroll, true)}/> <span>Auto-scroll</span></label> <button class="btn btn-outline" type="button">Clear</button></div> <div class="log-terminal svelte-gl5zbt"><!--[-->`);
        const each_array = ensure_array_like(logs);
        for (let idx = 0, $$length = each_array.length; idx < $$length; idx++) {
          let item = each_array[idx];
          $$renderer3.push(`<div${attr_class(`log-line level-${item.level}`, "svelte-gl5zbt")}><span class="log-ts svelte-gl5zbt">${escape_html(item.ts)}</span> <span class="log-level svelte-gl5zbt">${escape_html(item.level.toUpperCase())}</span> <span class="log-msg">${escape_html(item.msg)}</span></div>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section>`);
  });
}
function AdminQueueMonitor($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    onDestroy(() => {
    });
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Worker Queue Monitor</h2> <div class="grid-3">`);
    Card($$renderer2, {
      title: "Active",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Pending",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Failed",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Completed",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Avg Processing",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0 .toFixed(1))} ms`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Retries",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html(0)}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    Card($$renderer2, {
      title: "Jobs",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Queue-Daten...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function AdminRedisMonitor($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    onDestroy(() => {
    });
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Redis Monitor</h2> <div class="grid-3">`);
    Card($$renderer2, {
      title: "Health",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html("Disconnected")}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Configured",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html("No")}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Clients",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html("-")}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Memory",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html("-")}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Keys",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html("-")}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Slowlog",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->${escape_html("-")}`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-muted">Lade Redis-Daten...</p>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function AdminSecurityPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let user = "";
    let action = "";
    let dateFrom = "";
    let dateTo = "";
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Security Audit Panel</h2> `);
    Card($$renderer2, {
      title: "Filter",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="form-grid grid-2"><label><span>User</span><input class="input"${attr("value", user)}/></label> <label><span>Action</span><input class="input"${attr("value", action)}/></label> <label><span>Von</span><input class="input" type="date"${attr("value", dateFrom)}/></label> <label><span>Bis</span><input class="input" type="date"${attr("value", dateTo)}/></label></div> <div class="actions"><button class="btn btn-outline" type="button">Filter anwenden</button></div>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Card($$renderer2, {
      title: "Audit Entries",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Einträge...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section>`);
  });
}
function AdminErrorTracking($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let severity = "";
    onDestroy(() => {
    });
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">Live Error Tracking</h2> `);
    Card($$renderer2, {
      title: "Errors",
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="actions"><label><span class="text-muted">Severity</span> `);
        $$renderer3.select({ value: severity }, ($$renderer4) => {
          $$renderer4.option({ value: "" }, ($$renderer5) => {
            $$renderer5.push(`Alle`);
          });
          $$renderer4.option({ value: "warn" }, ($$renderer5) => {
            $$renderer5.push(`warn`);
          });
          $$renderer4.option({ value: "error" }, ($$renderer5) => {
            $$renderer5.push(`error`);
          });
          $$renderer4.option({ value: "fatal" }, ($$renderer5) => {
            $$renderer5.push(`fatal`);
          });
        });
        $$renderer3.push(`</label> <button class="btn btn-outline" type="button">Refresh</button></div> `);
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Fehler...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
function AdminApiHeatmap($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let items = [];
    let sortKey = "totalRequests";
    onDestroy(() => {
    });
    [...items].sort((a, b) => {
      const l = a[sortKey];
      const r = b[sortKey];
      if (typeof l === "string" && typeof r === "string") {
        return r.localeCompare(l);
      }
      const left = Number(l ?? 0);
      const right = Number(r ?? 0);
      return right - left;
    });
    $$renderer2.push(`<section class="section-block"><h2 class="section-title">API Request Heatmap</h2> `);
    Card($$renderer2, {
      title: "Endpoint Metrics",
      children: ($$renderer3) => {
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<p class="text-muted">Lade Heatmap...</p>`);
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></section>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let activeTab = "overview";
    const tabs = [
      { id: "overview", label: "Overview" },
      { id: "observability", label: "Observability" },
      { id: "users", label: "Users" },
      { id: "system-monitor", label: "System Monitor" },
      { id: "jobs", label: "Jobs" },
      { id: "docker", label: "Docker" },
      { id: "websocket", label: "WebSocket" },
      { id: "feature-flags", label: "Feature Flags" },
      { id: "database", label: "Database" },
      { id: "audit-logs", label: "Audit Logs" },
      { id: "log-stream", label: "Log Stream" },
      { id: "queue", label: "Queue" },
      { id: "redis", label: "Redis" },
      { id: "security", label: "Security" },
      { id: "errors", label: "Errors" },
      { id: "api-heatmap", label: "API Heatmap" }
    ];
    const tabTitles = {
      overview: "Overview",
      observability: "Observability",
      users: "Users",
      "system-monitor": "System Monitor",
      jobs: "Background Jobs",
      docker: "Docker",
      websocket: "WebSocket",
      "feature-flags": "Feature Flags",
      database: "Database Health",
      "audit-logs": "Audit Logs",
      "log-stream": "Log Stream",
      queue: "Queue Monitor",
      redis: "Redis Monitor",
      security: "Security Audit",
      errors: "Error Tracking",
      "api-heatmap": "API Heatmap"
    };
    const normalizeTab = (value) => {
      const candidate = String(value ?? "").trim();
      return tabs.some((tab) => tab.id === candidate) ? candidate : "overview";
    };
    const setTab = async (tab) => {
      activeTab = tab;
      const params = new URLSearchParams(store_get($$store_subs ??= {}, "$page", page).url.searchParams);
      params.set("tab", tab);
      await goto(`${store_get($$store_subs ??= {}, "$page", page).url.pathname}?${params.toString()}`, {});
    };
    onDestroy(() => {
    });
    if (store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("tab") !== activeTab) {
      activeTab = normalizeTab(store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("tab"));
    }
    $$renderer2.push(`<div class="page-stack"><section class="page-intro"><h1 class="page-title">Admin Dashboard</h1></section> `);
    if (!store_get($$store_subs ??= {}, "$session", session) || store_get($$store_subs ??= {}, "$session", session).role !== "admin") {
      $$renderer2.push("<!--[-->");
      Card($$renderer2, {
        title: "Kein Zugriff",
        children: ($$renderer3) => {
          $$renderer3.push(`<p class="text-muted">Admin-Berechtigung erforderlich.</p>`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="admin-layout svelte-1jef3w8">`);
      AdminSidebar($$renderer2, { tabs, activeTab, onSelect: (tab) => void setTab(tab) });
      $$renderer2.push(`<!----> <section class="admin-content svelte-1jef3w8">`);
      AdminTopBar($$renderer2, {
        title: tabTitles[activeTab],
        subtitle: "Admin Control Center",
        onRefresh: () => void setTab(activeTab)
      });
      $$renderer2.push(`<!----> `);
      if (activeTab === "overview") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div>`);
        AdminOverview($$renderer2, {});
        $$renderer2.push(`<!----></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (activeTab === "observability") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div>`);
          AdminObservability($$renderer2);
          $$renderer2.push(`<!----></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          if (activeTab === "users") {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div>`);
            AdminUserManagement($$renderer2);
            $$renderer2.push(`<!----></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
            if (activeTab === "system-monitor") {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<div>`);
              AdminSystemMonitor($$renderer2);
              $$renderer2.push(`<!----></div>`);
            } else {
              $$renderer2.push("<!--[!-->");
              if (activeTab === "jobs") {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<div>`);
                AdminJobs($$renderer2);
                $$renderer2.push(`<!----></div>`);
              } else {
                $$renderer2.push("<!--[!-->");
                if (activeTab === "docker") {
                  $$renderer2.push("<!--[-->");
                  $$renderer2.push(`<div>`);
                  AdminDocker($$renderer2);
                  $$renderer2.push(`<!----></div>`);
                } else {
                  $$renderer2.push("<!--[!-->");
                  if (activeTab === "websocket") {
                    $$renderer2.push("<!--[-->");
                    $$renderer2.push(`<div>`);
                    AdminWebSocket($$renderer2);
                    $$renderer2.push(`<!----></div>`);
                  } else {
                    $$renderer2.push("<!--[!-->");
                    if (activeTab === "feature-flags") {
                      $$renderer2.push("<!--[-->");
                      $$renderer2.push(`<div>`);
                      AdminFeatureFlags($$renderer2);
                      $$renderer2.push(`<!----></div>`);
                    } else {
                      $$renderer2.push("<!--[!-->");
                      if (activeTab === "database") {
                        $$renderer2.push("<!--[-->");
                        $$renderer2.push(`<div>`);
                        AdminDatabaseHealth($$renderer2);
                        $$renderer2.push(`<!----></div>`);
                      } else {
                        $$renderer2.push("<!--[!-->");
                        if (activeTab === "audit-logs") {
                          $$renderer2.push("<!--[-->");
                          $$renderer2.push(`<div>`);
                          AdminAuditLogs($$renderer2);
                          $$renderer2.push(`<!----></div>`);
                        } else {
                          $$renderer2.push("<!--[!-->");
                          if (activeTab === "log-stream") {
                            $$renderer2.push("<!--[-->");
                            $$renderer2.push(`<div>`);
                            AdminLogStream($$renderer2);
                            $$renderer2.push(`<!----></div>`);
                          } else {
                            $$renderer2.push("<!--[!-->");
                            if (activeTab === "queue") {
                              $$renderer2.push("<!--[-->");
                              $$renderer2.push(`<div>`);
                              AdminQueueMonitor($$renderer2);
                              $$renderer2.push(`<!----></div>`);
                            } else {
                              $$renderer2.push("<!--[!-->");
                              if (activeTab === "redis") {
                                $$renderer2.push("<!--[-->");
                                $$renderer2.push(`<div>`);
                                AdminRedisMonitor($$renderer2);
                                $$renderer2.push(`<!----></div>`);
                              } else {
                                $$renderer2.push("<!--[!-->");
                                if (activeTab === "security") {
                                  $$renderer2.push("<!--[-->");
                                  $$renderer2.push(`<div>`);
                                  AdminSecurityPanel($$renderer2);
                                  $$renderer2.push(`<!----></div>`);
                                } else {
                                  $$renderer2.push("<!--[!-->");
                                  if (activeTab === "errors") {
                                    $$renderer2.push("<!--[-->");
                                    $$renderer2.push(`<div>`);
                                    AdminErrorTracking($$renderer2);
                                    $$renderer2.push(`<!----></div>`);
                                  } else {
                                    $$renderer2.push("<!--[!-->");
                                    if (activeTab === "api-heatmap") {
                                      $$renderer2.push("<!--[-->");
                                      $$renderer2.push(`<div>`);
                                      AdminApiHeatmap($$renderer2);
                                      $$renderer2.push(`<!----></div>`);
                                    } else {
                                      $$renderer2.push("<!--[!-->");
                                    }
                                    $$renderer2.push(`<!--]-->`);
                                  }
                                  $$renderer2.push(`<!--]-->`);
                                }
                                $$renderer2.push(`<!--]-->`);
                              }
                              $$renderer2.push(`<!--]-->`);
                            }
                            $$renderer2.push(`<!--]-->`);
                          }
                          $$renderer2.push(`<!--]-->`);
                        }
                        $$renderer2.push(`<!--]-->`);
                      }
                      $$renderer2.push(`<!--]-->`);
                    }
                    $$renderer2.push(`<!--]-->`);
                  }
                  $$renderer2.push(`<!--]-->`);
                }
                $$renderer2.push(`<!--]-->`);
              }
              $$renderer2.push(`<!--]-->`);
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></section></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
