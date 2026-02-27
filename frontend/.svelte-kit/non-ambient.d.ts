
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/calendar" | "/chat" | "/inventory" | "/nfc" | "/packlists" | "/packlists/[eventId]" | "/settings";
		RouteParams(): {
			"/packlists/[eventId]": { eventId: string }
		};
		LayoutParams(): {
			"/": { eventId?: string };
			"/admin": Record<string, never>;
			"/calendar": Record<string, never>;
			"/chat": Record<string, never>;
			"/inventory": Record<string, never>;
			"/nfc": Record<string, never>;
			"/packlists": { eventId?: string };
			"/packlists/[eventId]": { eventId: string };
			"/settings": Record<string, never>
		};
		Pathname(): "/" | "/admin" | "/admin/" | "/calendar" | "/calendar/" | "/chat" | "/chat/" | "/inventory" | "/inventory/" | "/nfc" | "/nfc/" | "/packlists" | "/packlists/" | `/packlists/${string}` & {} | `/packlists/${string}/` & {} | "/settings" | "/settings/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/icon.svg" | "/manifest.json" | "/service-worker.js" | string & {};
	}
}