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
		client: {start:"_app/immutable/entry/start.CLPhdU_9.js",app:"_app/immutable/entry/app.CUJfkyWh.js",imports:["_app/immutable/entry/start.CLPhdU_9.js","_app/immutable/chunks/D8fPdA7f.js","_app/immutable/chunks/C8kF86bQ.js","_app/immutable/chunks/CHqKDu5a.js","_app/immutable/entry/app.CUJfkyWh.js","_app/immutable/chunks/C8kF86bQ.js","_app/immutable/chunks/uV_YHDYV.js","_app/immutable/chunks/CHqKDu5a.js","_app/immutable/chunks/CeiT44ef.js","_app/immutable/chunks/B6sYqa-z.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CAp7Krm3.js')),
			__memo(() => import('./chunks/1-CIk6nHxj.js')),
			__memo(() => import('./chunks/2-BcM3pfn8.js')),
			__memo(() => import('./chunks/3-B4bG6IwB.js')),
			__memo(() => import('./chunks/4-w90kQr8G.js')),
			__memo(() => import('./chunks/5-DOMF3bEx.js')),
			__memo(() => import('./chunks/6-BUBvS0B9.js')),
			__memo(() => import('./chunks/7-4CDSYu0V.js')),
			__memo(() => import('./chunks/8-CpIc5z2W.js')),
			__memo(() => import('./chunks/9-BYNFDJFu.js')),
			__memo(() => import('./chunks/10-JoAW-wDM.js'))
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
