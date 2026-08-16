#!/usr/bin/env node
/**
 * Validate packs/{slug}/pack.json and SVG presence.
 * Usage: node scripts/validate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const packsDir = path.join( root, 'packs' );

const banned = /<\s*(script|foreignObject|iframe|object|embed)\b/i;
const onAttr = /\son[a-z]+\s*=/i;

let errors = 0;

function fail( msg ) {
	console.error( '✖', msg );
	errors += 1;
}

if ( ! fs.existsSync( packsDir ) ) {
	fail( 'packs/ missing' );
	process.exit( 1 );
}

const slugs = new Set();
for ( const dir of fs.readdirSync( packsDir ) ) {
	const packRoot = path.join( packsDir, dir );
	if ( ! fs.statSync( packRoot ).isDirectory() ) {
		continue;
	}
	const manifestPath = path.join( packRoot, 'pack.json' );
	if ( ! fs.existsSync( manifestPath ) ) {
		fail( `${ dir }: missing pack.json` );
		continue;
	}
	let pack;
	try {
		pack = JSON.parse( fs.readFileSync( manifestPath, 'utf8' ) );
	} catch ( e ) {
		fail( `${ dir }: invalid pack.json (${ e.message })` );
		continue;
	}
	if ( ! pack.slug || ! pack.name || ! pack.version || ! Array.isArray( pack.icons ) ) {
		fail( `${ dir }: pack.json needs slug, name, version, icons[]` );
		continue;
	}
	if ( pack.slug !== dir ) {
		fail( `${ dir }: folder name must match pack.slug (${ pack.slug })` );
	}
	if ( slugs.has( pack.slug ) ) {
		fail( `duplicate slug: ${ pack.slug }` );
	}
	slugs.add( pack.slug );

	for ( const icon of pack.icons ) {
		const file = path.join( packRoot, icon.file || '' );
		if ( ! icon.slug || ! icon.file ) {
			fail( `${ pack.slug }: icon missing slug/file` );
			continue;
		}
		if ( ! fs.existsSync( file ) ) {
			fail( `${ pack.slug }: missing ${ icon.file }` );
			continue;
		}
		const raw = fs.readFileSync( file, 'utf8' );
		if ( ! raw.includes( '<svg' ) ) {
			fail( `${ pack.slug }/${ icon.slug }: not SVG` );
		}
		if ( banned.test( raw ) || onAttr.test( raw ) || /<!ENTITY/i.test( raw ) ) {
			fail( `${ pack.slug }/${ icon.slug }: unsafe SVG content` );
		}
	}
}

const indexPath = path.join( root, 'index.json' );
if ( fs.existsSync( indexPath ) ) {
	try {
		const index = JSON.parse( fs.readFileSync( indexPath, 'utf8' ) );
		if ( ! Array.isArray( index.packs ) ) {
			fail( 'index.json packs must be an array' );
		} else {
			for ( const row of index.packs ) {
				if ( ! row.slug || ! row.download?.url ) {
					fail( `index.json pack ${ row.slug || '?' }: needs slug + download.url` );
				}
			}
		}
	} catch ( e ) {
		fail( `index.json invalid: ${ e.message }` );
	}
}

if ( errors ) {
	console.error( `\n${ errors } error(s)` );
	process.exit( 1 );
}
console.log( `✓ ${ slugs.size } pack(s) ok` );
