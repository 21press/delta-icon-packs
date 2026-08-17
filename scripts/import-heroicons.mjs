#!/usr/bin/env node
/**
 * Import temp/heroicons into packs/heroicons-{outline,solid,mini,micro}.
 * Rewrites hard-coded fill/stroke colors → currentColor (keeps none/transparent).
 *
 * Usage: node scripts/import-heroicons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const srcRoot = path.join( root, 'temp', 'heroicons' );

const VARIANTS = [
	{
		slug: 'heroicons-outline',
		name: 'Heroicons Outline',
		description:
			'24×24 outline icons (1.5px stroke) from Heroicons by Tailwind Labs.',
		src: path.join( srcRoot, '24', 'outline' ),
	},
	{
		slug: 'heroicons-solid',
		name: 'Heroicons Solid',
		description: '24×24 solid icons from Heroicons by Tailwind Labs.',
		src: path.join( srcRoot, '24', 'solid' ),
	},
	{
		slug: 'heroicons-mini',
		name: 'Heroicons Mini',
		description: '20×20 solid mini icons from Heroicons by Tailwind Labs.',
		src: path.join( srcRoot, '20', 'solid' ),
	},
	{
		slug: 'heroicons-micro',
		name: 'Heroicons Micro',
		description: '16×16 solid micro icons from Heroicons by Tailwind Labs.',
		src: path.join( srcRoot, '16', 'solid' ),
	},
];

const HOMEPAGE = 'https://heroicons.com';
const VERSION = '1.0.0';
const LICENSE = 'MIT';

const PACK_README = `# {{name}}

Icons from [Heroicons](https://heroicons.com) by Tailwind Labs.

- License: MIT (see upstream Heroicons license)
- Pack version: {{version}}
- Style: {{style}}

Used with Delta Icon Manager as \`{{icon:{{slug}}/icon-name}}\`.
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

function writePack( variant ) {
	if ( ! fs.existsSync( variant.src ) ) {
		throw new Error( `Missing source: ${ variant.src }` );
	}

	const packRoot = path.join( root, 'packs', variant.slug );
	const iconsDir = path.join( packRoot, 'icons' );
	fs.mkdirSync( iconsDir, { recursive: true } );

	const files = fs
		.readdirSync( variant.src )
		.filter( ( f ) => f.endsWith( '.svg' ) )
		.sort();

	const icons = [];
	for ( const file of files ) {
		const slug = file.replace( /\.svg$/i, '' );
		const raw = fs.readFileSync( path.join( variant.src, file ), 'utf8' );
		const out = toCurrentColor( raw );
		fs.writeFileSync( path.join( iconsDir, `${ slug }.svg` ), out );
		icons.push( {
			slug,
			name: titleCase( slug ),
			file: `icons/${ slug }.svg`,
		} );
	}

	const previewWanted = [ 'home', 'heart', 'user' ];
	const have = new Set( icons.map( ( i ) => i.slug ) );
	const pack = {
		slug: variant.slug,
		name: variant.name,
		version: VERSION,
		license: LICENSE,
		homepage: HOMEPAGE,
		description: variant.description,
		previewIcons: previewWanted.filter( ( s ) => have.has( s ) ),
		icons,
	};

	fs.writeFileSync(
		path.join( packRoot, 'pack.json' ),
		JSON.stringify( pack, null, 2 ) + '\n'
	);

	const style = variant.slug.replace( 'heroicons-', '' );
	fs.writeFileSync(
		path.join( packRoot, 'README.md' ),
		PACK_README.replaceAll( '{{name}}', variant.name )
			.replaceAll( '{{version}}', VERSION )
			.replaceAll( '{{style}}', style )
			.replaceAll( '{{slug}}', variant.slug )
	);

	return icons.length;
}

if ( ! fs.existsSync( srcRoot ) ) {
	console.error( 'Missing temp/heroicons — place upstream SVGs there first.' );
	process.exit( 1 );
}

let total = 0;
for ( const variant of VARIANTS ) {
	const n = writePack( variant );
	total += n;
	console.log( `✓ ${ variant.slug }: ${ n } icons` );
}
console.log( `✓ imported ${ total } icons into ${ VARIANTS.length } packs` );
