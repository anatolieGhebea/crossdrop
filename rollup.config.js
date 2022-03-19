import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;

//
let compileList = [
	{
		fileName: 'app',
		folder: 'client_app',
	},
	{
		fileName: 'app',
		folder: 'server_app',
	}
];

function getConfig( fList ){
	let list = [];
	fList.forEach( f => {
		let out = {
			external: ['crypto'],
			input: 'src/svelte/'+f.folder+'/'+f.fileName+'.js',
			output: {
				globals: {
					'crypto': 'crypto'
				},
				sourcemap: true,
				format: 'iife',
				name: f.fileName,
				file: './public/js/'+f.folder+'/'+f.fileName+'.js'
			},
			plugins: [
				svelte({
					compilerOptions: {
						// enable run-time checks when not in production
						dev: !production
					}
				}),
				css(
					// { output: '../public/css/'+f.folder+'/'+f.fileName+'.css' }
					{ output: ''+f.fileName+'.css' }
				),
		
				// If you have external dependencies installed from
				// npm, you'll most likely need these plugins. In
				// some cases you'll need additional configuration —
				// consult the documentation for details:
				// https://github.com/rollup/rollup-plugin-commonjs
				resolve({
					browser: true,
					// dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/'),
				}),
				commonjs(),

				// allows json import from filesystem
				json(),
		
				// Watch the `public` directory and refresh the
				// browser on changes when not in production
				!production && livereload('public'),
		
				// If we're building for production (npm run build
				// instead of npm run dev), minify
				production && terser()
			],
			watch: { clearScreen: false }
		}
	
		list.push(out);
	});

	return list;
}

let config = getConfig( compileList );

export default config;