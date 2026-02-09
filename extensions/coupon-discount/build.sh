#!/bin/sh
set -e

JAVY_PLUGIN="$(dirname "$(which javy)")/../lib/node_modules/@shopify/cli/bin/shopify_functions_javy_v1.wasm"

mkdir -p dist

# --- Generate entrypoint that exports run() as the CLI's ExportJavyBuilder does ---
cat > dist/entrypoint.js << 'ENTRY'
import __runFunction from "@shopify/shopify_function/run";
import userFunction from "user-function";
export function run() { return __runFunction(userFunction); }
ENTRY

# --- Generate WIT file for WASM export registration ---
cat > dist/function.wit << 'WIT'
package function:impl;

world shopify-function {
  export run: func();
}
WIT

# --- Bundle: resolve imports, alias user-function to our run.js ---
npx esbuild dist/entrypoint.js \
  --bundle \
  --outfile=dist/function.js \
  --format=esm \
  --target=esnext \
  --alias:user-function=./src/run.js

# --- Compile to WASM with Shopify plugin + WIT for proper exports ---
javy build -C dynamic \
  -C plugin="$JAVY_PLUGIN" \
  -C wit=dist/function.wit \
  -C wit-world=shopify-function \
  dist/function.js -o dist/function.wasm
