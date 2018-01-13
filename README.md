# Private methods and getter/setters support for Acorn

[![NPM version](https://img.shields.io/npm/v/acorn-private-methods.svg)](https://www.npmjs.org/package/acorn-private-methods)

This is a plugin for [Acorn](http://marijnhaverbeke.nl/acorn/) - a tiny, fast JavaScript parser, written completely in JavaScript.

It implements support for private methods, getters and setters as defined in the stage 3 proposal [Private methods and getter/setters for JavaScript classes](https://github.com/tc39/proposal-private-methods). The emitted AST follows [an ESTree proposal](https://github.com/estree/estree/pull/180).

## Usage

You can use this module directly in order to get an Acorn instance with the plugin installed:

```javascript
var acorn = require('acorn-private-methods');
```

Or you can use `inject.js` for injecting the plugin into your own version of Acorn like this:

```javascript
var acorn = require('acorn-private-methods/inject')(require('./custom-acorn'));
```

Then, use the `plugins` option to enable the plugiin:

```javascript
var ast = acorn.parse(code, {
  plugins: { privateMethods: true }
});
```

## License

This plugin is released under the [GNU Affero General Public License](./LICENSE).
