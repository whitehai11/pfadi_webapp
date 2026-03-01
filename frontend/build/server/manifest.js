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
		client: {start:"_app/immutable/entry/start.ctBC59Ci.js",app:"_app/immutable/entry/app.dPG5iRoh.js",imports:["_app/immutable/entry/start.ctBC59Ci.js","_app/immutable/chunks/BQLVEddS.js","_app/immutable/chunks/BojMKeEq.js","_app/immutable/chunks/BpT2i3Vw.js","_app/immutable/entry/app.dPG5iRoh.js","_app/immutable/chunks/BojMKeEq.js","_app/immutable/chunks/MhwRjeph.js","_app/immutable/chunks/BpT2i3Vw.js","_app/immutable/chunks/-Odr4UkV.js","_app/immutable/chunks/BDVKUOOh.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CaIyl3dY.js')),
			__memo(() => import('./chunks/1-C8kXHycC.js')),
			__memo(() => import('./chunks/2-DPpVaiXJ.js')),
			__memo(() => import('./chunks/3-Dwa6tNq1.js')),
			__memo(() => import('./chunks/4-BUHBCxF4.js')),
			__memo(() => import('./chunks/5-D4JpFw3O.js')),
			__memo(() => import('./chunks/6-B4ZEoOCD.js')),
			__memo(() => import('./chunks/7-xoYk2Ptb.js')),
			__memo(() => import('./chunks/8-Cgls3caI.js')),
			__memo(() => import('./chunks/9-CyFtb5-4.js')),
			__memo(() => import('./chunks/10-DY9-qdiu.js'))
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
