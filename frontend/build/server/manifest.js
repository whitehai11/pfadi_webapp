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
		client: {start:"_app/immutable/entry/start.sCebUB_F.js",app:"_app/immutable/entry/app.DdQKAQjz.js",imports:["_app/immutable/entry/start.sCebUB_F.js","_app/immutable/chunks/DUo0zV--.js","_app/immutable/chunks/CzUDGI30.js","_app/immutable/chunks/DIV0lPSS.js","_app/immutable/entry/app.DdQKAQjz.js","_app/immutable/chunks/CzUDGI30.js","_app/immutable/chunks/d9KJsiLq.js","_app/immutable/chunks/DIV0lPSS.js","_app/immutable/chunks/AP2r_tLJ.js","_app/immutable/chunks/qFyRA1eN.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CYO1ZRCx.js')),
			__memo(() => import('./chunks/1-BJV-9eCR.js')),
			__memo(() => import('./chunks/2-C2pJCck_.js')),
			__memo(() => import('./chunks/3-BOKgjPPv.js')),
			__memo(() => import('./chunks/4-BeV2MktE.js')),
			__memo(() => import('./chunks/5-Cyv0F0m8.js')),
			__memo(() => import('./chunks/6-HjRYNINV.js')),
			__memo(() => import('./chunks/7-dc5UZLj6.js')),
			__memo(() => import('./chunks/8-9b-yglaN.js')),
			__memo(() => import('./chunks/9-BFxymq5c.js')),
			__memo(() => import('./chunks/10-CIw-kfYq.js'))
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
