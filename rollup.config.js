import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import babel from "@rollup/plugin-babel";
import postcss from "rollup-plugin-postcss";
import postcssNested from "postcss-nested";

const isProd = process.env.BUILD === "production";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ROLLUP
if you want to view the source visit the plugins github repository
*/
`;

export default {
  input: "src/main.ts",
  output: {
    dir: ".",
    sourcemap: "inline",
    sourcemapExcludeSources: isProd,
    format: "cjs",
    exports: "default",
    banner,
  },
  external: ["obsidian"],
  plugins: [
    commonjs({
      include: "node_modules/**",
    }),
    babel({
      babelHelpers: "bundled",
      extensions: [".tsx", ".ts"],
      plugins: ["astroturf/plugin"],
    }),
    postcss({
      extract: "styles.css",
      modules: true,
      plugins: [postcssNested],
    }),
    typescript(),
    nodeResolve({ browser: true }),
    json(),
  ],
  watch: {
    chokidar: {
      usePolling: true,
    },
  },
};
