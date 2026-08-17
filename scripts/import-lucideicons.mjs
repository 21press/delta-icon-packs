#!/usr/bin/env node
/**
 * Import temp/lucideicons into packs/lucide (single outline set).
 * Strips HTML comments; rewrites hard-coded fill/stroke → currentColor.
 *
 * Usage: node scripts/import-lucideicons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const srcRoot = path.join( root, 'temp', 'lucideicons' );

const VARIANT = {
	slug: 'lucide',
	name: 'Lucide',
	description: '24×24 outline icons from Lucide (ISC).',
	src: srcRoot,
};

const HOMEPAGE = 'https://lucide.dev';
const VERSION = '1.0.0';
const LICENSE = 'ISC';

const PACK_README = `# Lucide

Icons from [Lucide](https://lucide.dev).

- License: ISC (see upstream Lucide license)
- Pack version: ${ VERSION }

Used with Delta Icon Manager as \`{{icon:lucide/icon-name}}\`.
`;

function titleCase( slug ) {
	return slug
		.split( '-' )
		.filter( Boolean )
		.map( ( w ) => w.charAt( 0 ).toUpperCase() + w.slice( 1 ) )
		.join( ' ' );
}

function toCurrentColor( svg ) {
	return svg.replace(
		/\b(fill|stroke)=["'](?!none\b|currentColor\b|transparent\b|url\()([^"']*)["']/gi,
		'$1="currentColor"'
	);
}

function cleanSvg( svg ) {
	let out = svg.replace( /<!--[\s\S]*?-->/g, '' ).trim();
	out = toCurrentColor( out );
	return out.endsWith( '\n' ) ? out : out + '\n';
}

function writePack() {
	if ( ! fs.existsSync( VARIANT.src ) ) {
		throw new Error( `Missing source: ${ VARIANT.src }` );
	}

	const packRoot = path.join( root, 'packs', VARIANT.slug );
	const iconsDir = path.join( packRoot, 'icons' );
	fs.mkdirSync( iconsDir, { recursive: true } );

	const files = fs
		.readdirSync( VARIANT.src )
		.filter( ( f ) => f.endsWith( '.svg' ) )
		.sort();

	const icons = [];
	for ( const file of files ) {
		const slug = file.replace( /\.svg$/i, '' );
		const raw = fs.readFileSync( path.join( VARIANT.src, file ), 'utf8' );
		fs.writeFileSync( path.join( iconsDir, `${ slug }.svg` ), cleanSvg( raw ) );
		icons.push( {
			slug,
			name: titleCase( slug ),
			file: `icons/${ slug }.svg`,
		} );
	}

	// Lucide uses "house" not "home".
	const previewWanted = [ 'house', 'home', 'heart', 'user' ];
	const have = new Set( icons.map( ( i ) => i.slug ) );
	const pack = {
		slug: VARIANT.slug,
		name: VARIANT.name,
		version: VERSION,
		license: LICENSE,
		homepage: HOMEPAGE,
		description: VARIANT.description,
		previewIcons: previewWanted.filter( ( s ) => have.has( s ) ).slice( 0, 3 ),
		icons,
	};

	fs.writeFileSync(
		path.join( packRoot, 'pack.json' ),
		JSON.stringify( pack, null, 2 ) + '\n'
	);
	fs.writeFileSync( path.join( packRoot, 'README.md' ), PACK_README );

	return icons.length;
}

if ( ! fs.existsSync( srcRoot ) ) {
	console.error( 'Missing temp/lucideicons — place upstream SVGs there first.' );
	process.exit( 1 );
}

const n = writePack();
console.log( `✓ ${ VARIANT.slug }: ${ n } icons` );
