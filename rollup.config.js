import babel from 'rollup-plugin-babel';
import eslint from 'rollup-plugin-eslint';
import node from "rollup-plugin-node-resolve";
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

const fs = require("fs");
const banner = fs.readFileSync('./src/banner.txt', 'utf8');
console.log(banner);
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/voodoo.js',
    format: 'iife',
    name: 'Voodoo',
    globals: {
      'window': 'window'
    },
    banner
  },
  external: [ 'window' ],
  plugins: [
    //node({ module: true }),
    resolve({
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs({
      ignore: [ 'conditional-runtime-dependency' ]
    }),

    eslint({
      exclude: [
        'src/styles/**',
      ]
    }),

    babel({
      exclude: 'node_modules/**',
    }),
  ],
};
