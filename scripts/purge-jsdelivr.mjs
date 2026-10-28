#!/usr/bin/env node
/**
 * Purge jsDelivr CDN cache for the catalog index.json, and for the pack.json of each pack named.
 * Delta sites fetch https://cdn.jsdelivr.net/gh/21press/delta-icon-packs@main/index.json, and
 * packs/{slug}/pack.json from the same ref to install single icons: a stale pack.json hides the
 * icons a new release added.
 * Usage: node scripts/purge-jsdelivr.mjs [slug | release-tag ...]
 *   A release tag ({slug}-{version}, e.g. tabler-outline-1.1.0) names its pack.
 * Optional: JSDELIVR_PURGE_PATH=gh/org/repo@ref/file.json (purges that one path instead)
 */
const BASE = 'gh/21press/delta-icon-packs@main';

const slugs = process.argv
	.slice( 2 )
	.map( ( arg ) => arg.trim().replace( /-\d+\.\d+\.\d+$/, '' ) )
	.filter( ( slug ) => /^[a-z0-9-]+$/.test( slug ) );

const paths = process.env.JSDELIVR_PURGE_PATH
	? [ process.env.JSDELIVR_PURGE_PATH ]
	: [ `${ BASE }/index.json`, ...slugs.map( ( slug ) => `${ BASE }/packs/${ slug }/pack.json` ) ];

let failed = false;
for ( const path of paths ) {
	const url = `https://purge.jsdelivr.net/${ path.replace( /^\//, '' ) }`;
	const res = await fetch( url, {
		method: 'GET',
		headers: { Accept: 'application/json' },
	} );
	const text = await res.text();
	let body = text;
	try {
		body = JSON.stringify( JSON.parse( text ), null, 2 );
	} catch {
		// keep raw text
	}

	if ( ! res.ok ) {
		console.error( `jsDelivr purge failed (${ res.status }): ${ url }` );
		console.error( body );
		failed = true;
		continue;
	}

	console.log( `Purged ${ url }` );
	console.log( body );
}

if ( failed ) {
	process.exit( 1 );
}
