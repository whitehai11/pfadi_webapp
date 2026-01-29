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
		client: {start:"_app/immutable/entry/start.ByfdX2ES.js",app:"_app/immutable/entry/app.CHFeQt8x.js",imports:["_app/immutable/entry/start.ByfdX2ES.js","_app/immutable/chunks/DpVb3R87.js","_app/immutable/chunks/DrZxtosp.js","_app/immutable/chunks/PPGuM6Ad.js","_app/immutable/entry/app.CHFeQt8x.js","_app/immutable/chunks/DrZxtosp.js","_app/immutable/chunks/CXN8AEkE.js","_app/immutable/chunks/PPGuM6Ad.js","_app/immutable/chunks/C09UTFEA.js","_app/immutable/chunks/DS51lxhO.js","_app/immutable/chunks/DpCRy2tt.js","_app/immutable/chunks/DbI0K5eF.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-DHeD8zIM.js')),
			__memo(() => import('./chunks/1-CAO-AW2c.js')),
			__memo(() => import('./chunks/2-BfWn-PmZ.js')),
			__memo(() => import('./chunks/3-ChIYYT-3.js')),
			__memo(() => import('./chunks/4-C-P_qhXK.js')),
			__memo(() => import('./chunks/5-DQguvdeP.js')),
			__memo(() => import('./chunks/6-BS8XVQIb.js')),
			__memo(() => import('./chunks/7-cp7WLSbd.js')),
			__memo(() => import('./chunks/8-6kYCjeis.js')),
			__memo(() => import('./chunks/9-U7t5wwsE.js'))
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
				id: "/inventory",
				pattern: /^\/inventory\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/nfc",
				pattern: /^\/nfc\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/packlists",
				pattern: /^\/packlists\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/packlists/[eventId]",
				pattern: /^\/packlists\/([^/]+?)\/?$/,
				params: [{"name":"eventId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
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
