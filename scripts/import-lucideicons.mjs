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
const VERSION = '1.1.0';
const LICENSE = 'ISC';

const packReadme = ( built ) => `# Lucide

Icons from [Lucide](https://lucide.dev).

- License: ISC (see upstream Lucide license)
- Pack version: ${ VERSION }
- Built from: ${ built.package } ${ built.version }

Used with Delta Icon Manager as \`{{icon:lucide/icon-name}}\`.
`;

/**
 * Upstream package and version, from the package.json copied into temp/ with the SVGs.
 */
function upstream() {
	const file = path.join( srcRoot, 'package.json' );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `Missing ${ file } — copy the lucide-static package.json next to the SVGs.` );
	}
	const pkg = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( pkg.name !== 'lucide-static' ) {
		throw new Error( `Expected lucide-static, found ${ pkg.name } in ${ file }` );
	}
	return { package: pkg.name, version: pkg.version };
}

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
	// lucide-static adds class="lucide lucide-{name}"; the pack keeps the plain drawing.
	out = out.replace( /<svg\b[^>]*>/, ( tag ) => tag.replace( /\s+class="[^"]*"/, '' ) );
	out = toCurrentColor( out );
	return out.endsWith( '\n' ) ? out : out + '\n';
}

function writePack() {
	if ( ! fs.existsSync( VARIANT.src ) ) {
		throw new Error( `Missing source: ${ VARIANT.src }` );
	}

	const packRoot = path.join( root, 'packs', VARIANT.slug );
	const iconsDir = path.join( packRoot, 'icons' );
	// Start empty: an icon upstream renamed or removed must not stay in the pack.
	fs.rmSync( iconsDir, { recursive: true, force: true } );
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
		upstream: upstream(),
		description: VARIANT.description,
		previewIcons: previewWanted.filter( ( s ) => have.has( s ) ).slice( 0, 3 ),
		icons,
	};

	fs.writeFileSync(
		path.join( packRoot, 'pack.json' ),
		JSON.stringify( pack, null, 2 ) + '\n'
	);
	fs.writeFileSync( path.join( packRoot, 'README.md' ), packReadme( pack.upstream ) );

	return icons.length;
}

if ( ! fs.existsSync( srcRoot ) ) {
	console.error( 'Missing temp/lucideicons — place upstream SVGs there first.' );
	process.exit( 1 );
}

const n = writePack();
console.log( `✓ ${ VARIANT.slug }: ${ n } icons` );
