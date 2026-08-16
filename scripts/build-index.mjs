#!/usr/bin/env node
/**
 * Rebuild index.json from packs/{slug}/pack.json.
 * Download URLs keep prior index values when present; otherwise placeholder release URL.
 * Usage: node scripts/build-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const packsDir = path.join( root, 'packs' );
const indexPath = path.join( root, 'index.json' );

let previous = { packs: [] };
if ( fs.existsSync( indexPath ) ) {
	try {
		previous = JSON.parse( fs.readFileSync( indexPath, 'utf8' ) );
	} catch {
		previous = { packs: [] };
	}
}
const prevBySlug = new Map(
	( previous.packs || [] ).map( ( p ) => [ p.slug, p ] )
);

const packs = [];
for ( const dir of fs.readdirSync( packsDir ).sort() ) {
	const packRoot = path.join( packsDir, dir );
	if ( ! fs.statSync( packRoot ).isDirectory() ) {
		continue;
	}
	const manifestPath = path.join( packRoot, 'pack.json' );
	if ( ! fs.existsSync( manifestPath ) ) {
		continue;
	}
	const pack = JSON.parse( fs.readFileSync( manifestPath, 'utf8' ) );
	const prev = prevBySlug.get( pack.slug ) || {};
	const tag = `${ pack.slug }-${ pack.version }`;
	const defaultUrl = `https://github.com/21press/delta-icon-packs/releases/download/${ tag }/${ pack.slug }.zip`;
	packs.push( {
		slug: pack.slug,
		name: pack.name,
		description: pack.description || '',
		version: pack.version,
		license: pack.license || '',
		iconCount: Array.isArray( pack.icons ) ? pack.icons.length : 0,
		previewIcons: ( pack.icons || [] ).slice( 0, 3 ).map( ( i ) => i.slug ),
		homepage: pack.homepage || '',
		download: {
			type: 'zip',
			url: prev.download?.url && prev.version === pack.version ? prev.download.url : defaultUrl,
		},
	} );
}

const index = {
	version: 1,
	updatedAt: new Date().toISOString(),
	packs,
};

fs.writeFileSync( indexPath, JSON.stringify( index, null, 2 ) + '\n' );
console.log( `✓ wrote index.json (${ packs.length } pack(s))` );
