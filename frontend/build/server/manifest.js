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
		client: {start:"_app/immutable/entry/start.CLSt1nNP.js",app:"_app/immutable/entry/app.SdxKO3RV.js",imports:["_app/immutable/entry/start.CLSt1nNP.js","_app/immutable/chunks/CVP6w6Fs.js","_app/immutable/chunks/w-mzlFmr.js","_app/immutable/chunks/JwFx-ZGo.js","_app/immutable/entry/app.SdxKO3RV.js","_app/immutable/chunks/w-mzlFmr.js","_app/immutable/chunks/BORbJVnw.js","_app/immutable/chunks/JwFx-ZGo.js","_app/immutable/chunks/B2pNWRM-.js","_app/immutable/chunks/NFaQR_Px.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-Dzw1QJmW.js')),
			__memo(() => import('./chunks/1-DBpy-uem.js')),
			__memo(() => import('./chunks/2-BsT2bQC5.js')),
			__memo(() => import('./chunks/3-CNMPIuQb.js')),
			__memo(() => import('./chunks/4-DIf5UCkn.js')),
			__memo(() => import('./chunks/5-BvgwIt71.js')),
			__memo(() => import('./chunks/6-B-4HnJgb.js')),
			__memo(() => import('./chunks/7-u2XjatlZ.js')),
			__memo(() => import('./chunks/8-DYG8n5MH.js')),
			__memo(() => import('./chunks/9-B820UkaI.js'))
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
