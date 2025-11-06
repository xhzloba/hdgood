/**
 * Tailwind CSS v4 requires the PostCSS plugin to resolve
 * `@import "tailwindcss"` and related directives.
 * This config enables proper CSS processing under Next.js + Turbopack.
 */
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};