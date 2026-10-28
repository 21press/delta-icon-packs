#!/usr/bin/env node
/**
 * Import temp/tablericons into packs/tabler-{outline,filled}.
 * Strips HTML comments; rewrites hard-coded fill/stroke → currentColor.
 *
 * Usage: node scripts/import-tablericons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const srcRoot = path.join( root, 'temp', 'tablericons' );

const VARIANTS = [
	{
		slug: 'tabler-outline',
		name: 'Tabler Outline',
		description: '24×24 outline icons (2px stroke) from Tabler Icons.',
		src: path.join( srcRoot, 'outline' ),
	},
	{
		slug: 'tabler-filled',
		name: 'Tabler Filled',
		description: '24×24 filled icons from Tabler Icons.',
		src: path.join( srcRoot, 'filled' ),
	},
];

const HOMEPAGE = 'https://tabler.io/icons';
const VERSION = '1.1.0';
const LICENSE = 'MIT';

const PACK_README = `# {{name}}

Icons from [Tabler Icons](https://tabler.io/icons).

- License: MIT (see upstream Tabler Icons license)
- Pack version: {{version}}
- Built from: {{upstream}}
- Style: {{style}}

Used with Delta Icon Manager as \`{{icon:{{slug}}/icon-name}}\`.
`;

/**
 * Upstream package and version, from the package.json copied into temp/ with the SVGs.
 */
function upstream() {
	const file = path.join( srcRoot, 'package.json' );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `Missing ${ file } — copy the @tabler/icons package.json next to the SVGs.` );
	}
	const pkg = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	if ( pkg.name !== '@tabler/icons' ) {
		throw new Error( `Expected @tabler/icons, found ${ pkg.name } in ${ file }` );
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
	// The npm build adds a class (a generic "icon" a site's CSS may already style) and an
	// invisible 24×24 bounding path; the pack keeps the plain drawing, as installed icons have it.
	out = out.replace( /<svg\b[^>]*>/, ( tag ) => tag.replace( /\s+class="[^"]*"/, '' ) );
	out = out.replace( /[ \t]*<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>\n?/, '' );
	out = toCurrentColor( out );
	return out.endsWith( '\n' ) ? out : out + '\n';
}

function writePack( variant ) {
	if ( ! fs.existsSync( variant.src ) ) {
		throw new Error( `Missing source: ${ variant.src }` );
	}

	const packRoot = path.join( root, 'packs', variant.slug );
	const iconsDir = path.join( packRoot, 'icons' );
	// Start empty: an icon upstream renamed or removed must not stay in the pack.
	fs.rmSync( iconsDir, { recursive: true, force: true } );
	fs.mkdirSync( iconsDir, { recursive: true } );

	const files = fs
		.readdirSync( variant.src )
		.filter( ( f ) => f.endsWith( '.svg' ) )
		.sort();

	const icons = [];
	for ( const file of files ) {
		const slug = file.replace( /\.svg$/i, '' );
		const raw = fs.readFileSync( path.join( variant.src, file ), 'utf8' );
		const out = cleanSvg( raw );
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
		upstream: upstream(),
		description: variant.description,
		previewIcons: previewWanted.filter( ( s ) => have.has( s ) ),
		icons,
	};

	fs.writeFileSync(
		path.join( packRoot, 'pack.json' ),
		JSON.stringify( pack, null, 2 ) + '\n'
	);

	const style = variant.slug.replace( 'tabler-', '' );
	fs.writeFileSync(
		path.join( packRoot, 'README.md' ),
		PACK_README.replaceAll( '{{name}}', variant.name )
			.replaceAll( '{{version}}', VERSION )
			.replaceAll( '{{style}}', style )
			.replaceAll( '{{slug}}', variant.slug )
			.replaceAll( '{{upstream}}', `${ pack.upstream.package } ${ pack.upstream.version }` )
	);

	return icons.length;
}

if ( ! fs.existsSync( srcRoot ) ) {
	console.error( 'Missing temp/tablericons — place upstream SVGs there first.' );
	process.exit( 1 );
}

let total = 0;
for ( const variant of VARIANTS ) {
	const n = writePack( variant );
	total += n;
	console.log( `✓ ${ variant.slug }: ${ n } icons` );
}
console.log( `✓ imported ${ total } icons into ${ VARIANTS.length } packs` );
