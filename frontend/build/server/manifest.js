const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["icon.svg","manifest.json","service-worker.js","service-worker.js"]),
	mimeTypes: {".svg":"image/svg+xml",".json":"application/json",".js":"text/javascript"},
	_: {
		client: {start:"_app/immutable/entry/start.B0_V_1_C.js",app:"_app/immutable/entry/app.DVgS6zjd.js",imports:["_app/immutable/entry/start.B0_V_1_C.js","_app/immutable/chunks/B6BmHjNq.js","_app/immutable/chunks/jsP0QahD.js","_app/immutable/chunks/Dd6jCOQM.js","_app/immutable/entry/app.DVgS6zjd.js","_app/immutable/chunks/jsP0QahD.js","_app/immutable/chunks/BR0pQt4q.js","_app/immutable/chunks/Dd6jCOQM.js","_app/immutable/chunks/CJiOvZbK.js","_app/immutable/chunks/DBec8a9l.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-D3A8ODuq.js')),
			__memo(() => import('./chunks/1-qmrf_UvD.js')),
			__memo(() => import('./chunks/2-Bbl51Gqq.js')),
			__memo(() => import('./chunks/3-DvFZejS1.js')),
			__memo(() => import('./chunks/4-oYMK4GCc.js')),
			__memo(() => import('./chunks/5-BfJT3efP.js')),
			__memo(() => import('./chunks/6-CjSenQDh.js')),
			__memo(() => import('./chunks/7-u2s2s7es.js')),
			__memo(() => import('./chunks/8-Dynux9wj.js')),
			__memo(() => import('./chunks/9-4CX0gQky.js')),
			__memo(() => import('./chunks/10-RDS2P1cJ.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/calendar",
				pattern: /^\/calendar\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/chat",
				pattern: /^\/chat\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/inventory",
				pattern: /^\/inventory\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/nfc",
				pattern: /^\/nfc\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/packlists",
				pattern: /^\/packlists\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/packlists/[eventId]",
				pattern: /^\/packlists\/([^/]+?)\/?$/,
				params: [{"name":"eventId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
