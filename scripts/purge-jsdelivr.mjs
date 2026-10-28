#!/usr/bin/env node
/**
 * Purge jsDelivr CDN cache for the catalog index.json, and for the pack.json of each pack named.
 * Delta sites fetch https://cdn.jsdelivr.net/gh/21press/delta-icon-packs@main/index.json, and
 * packs/{slug}/pack.json from the same ref to install single icons: a stale pack.json hides the
 * icons a new release added.
 *
 * After a purge the CDN copy is checked against the file in this checkout (run it on main).
 * jsDelivr can answer "finished" and still serve the previous commit when @main has not caught
 * up with a push yet (seen on the 1.1.0 releases): a file that differs is purged again until it
 * matches, or the script fails.
 *
 * Usage: node scripts/purge-jsdelivr.mjs [slug | release-tag ...]
 *   A release tag ({slug}-{version}, e.g. tabler-outline-1.1.0) names its pack.
 * Optional:
 *   JSDELIVR_PURGE_PATH=gh/org/repo@ref/file.json  purge that one path instead (not checked)
 *   PURGE_ATTEMPTS=10       checks before giving up
 *   PURGE_WAIT_SECONDS=30   wait between checks
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const BASE = 'gh/21press/delta-icon-packs@main';
const ATTEMPTS = Math.max( 1, Number( process.env.PURGE_ATTEMPTS || 10 ) );
const WAIT_MS = Math.max( 0, Number( process.env.PURGE_WAIT_SECONDS ?? 30 ) ) * 1000;

const slugs = process.argv
	.slice( 2 )
	.map( ( arg ) => arg.trim().replace( /-\d+\.\d+\.\d+$/, '' ) )
	.filter( ( slug ) => /^[a-z0-9-]+$/.test( slug ) );

/** @type {{ cdn: string, local: string | null }[]} */
const targets = process.env.JSDELIVR_PURGE_PATH
	? [ { cdn: process.env.JSDELIVR_PURGE_PATH.replace( /^\//, '' ), local: null } ]
	: [ 'index.json', ...slugs.map( ( slug ) => `packs/${ slug }/pack.json` ) ].map( ( file ) => ( {
		cdn: `${ BASE }/${ file }`,
		local: path.join( root, file ),
	} ) );

const sleep = ( ms ) => new Promise( ( resolve ) => setTimeout( resolve, ms ) );

async function purge( cdnPath ) {
	const url = `https://purge.jsdelivr.net/${ cdnPath }`;
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
		return false;
	}
	console.log( `Purged ${ url }` );
	console.log( body );
	return true;
}

/** Same JSON as the local file; whitespace does not count. */
async function served( target ) {
	const res = await fetch( `https://cdn.jsdelivr.net/${ target.cdn }`, { headers: { Accept: 'application/json' } } );
	if ( ! res.ok ) {
		return false;
	}
	try {
		const remote = JSON.stringify( JSON.parse( await res.text() ) );
		const local = JSON.stringify( JSON.parse( fs.readFileSync( target.local, 'utf8' ) ) );
		return remote === local;
	} catch {
		return false;
	}
}

let failed = false;
for ( const target of targets ) {
	if ( ! ( await purge( target.cdn ) ) ) {
		failed = true;
		continue;
	}
	if ( null === target.local || ! fs.existsSync( target.local ) ) {
		continue;
	}
	let ok = false;
	for ( let attempt = 1; attempt <= ATTEMPTS; attempt++ ) {
		await sleep( WAIT_MS );
		if ( await served( target ) ) {
			ok = true;
			break;
		}
		console.log( `CDN still serves an older ${ target.cdn } (check ${ attempt }/${ ATTEMPTS }).` );
		if ( attempt < ATTEMPTS ) {
			await purge( target.cdn );
		}
	}
	if ( ok ) {
		console.log( `✓ CDN serves the current ${ target.cdn }` );
	} else {
		console.error( `✗ CDN still serves an older ${ target.cdn } after ${ ATTEMPTS } checks. Run \`npm run purge:cdn\` again later.` );
		failed = true;
	}
}

if ( failed ) {
	process.exit( 1 );
}
