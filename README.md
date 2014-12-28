# sass-convert [![npm version](http://img.shields.io/npm/v/sass-convert.svg?style=flat)](https://www.npmjs.org/package/sass-convert) [![Build Status: Linux](http://img.shields.io/travis/SassDoc/sass-convert.svg?style=flat)](https://travis-ci.org/SassDoc/sass-convert?branch=master)

> Node.js bindings to [sass-convert].

sass-convert is a library that provides binding for Node.js to [sass-convert],
the converter shipped with Sass. Integrates the converter in a stream pipeline.


## Options

### from*
type: `String`  
The format to convert from. Can be `css`, `scss`, `sass`.

### to*
type: `String`  
The format to convert to. Can be `scss` or `sass`.

### force
type: `Boolean`  
default: `false`  
Continue the stream chain even if the converter is unable to work properly
(e.g.: no `sass-convert` binary found). Unconverted chunks/files won't be pushed
to the next pipe anyway.

### dasherize
type: `Boolean`  
Convert underscores to dashes.

### indent
type: `Number|String`  
How many spaces to use for each level of indentation. Defaults to 2.
`'t'` means use hard tabs.

### old
type: `Boolean`  
Output the old-style `:prop val` property syntax.
Only meaningful when generating Sass.

### default-encoding
type: `String`  
Specify the default encoding for input files.

### unix-newlines
type: `Boolean`  
Use Unix-style newlines in written files.
Always true on Unix.


## Installation

```
npm i sass-convert --save
```

## Requirements

You need to have Sass (Ruby Sass >=3.4.5) installed.
Either globally or locally with Bundler.


## Usage

```js
var vfs = require('vinyl-fs');
var converter = require('sass-convert');

vfs.src('./input/**/*.+(sass|scss|css)')
  .pipe(converter({
    from: 'sass',
    to: 'scss',
  }))
  .pipe(vfs.dest('./output'));

```

```js
var gulp = require('gulp');
var sassdoc = require('gulp-sassdoc');
var converter = require('sass-convert');

gulp.task('sassdoc', function () {
  return gulp.src('./input/**/*.+(sass|scss)')
    .pipe(converter({
      from: 'sass',
      to: 'scss',
    }))
    .pipe(sassdoc({
      'dest': 'path/to/docs'
    }));
});
```

```js
var fs = require('fs');
var vfs = require('vinyl-fs');
var source = require('vinyl-source-stream');
var rename = require('gulp-rename');

fs.createReadStream('./file.sass')
  .pipe(source('file.sass'))
  .pipe(converter({
    from: 'sass',
    to: 'scss',
  }))
  .pipe(rename('file.scss'))
  .pipe(vfs.dest('./'));
```

## Credits

* [Pascal Duez](https://twitter.com/pascalduez)
* [Valérian Galliat](https://twitter.com/valeriangalliat)
* [Fabrice Weinberg](https://twitter.com/fweinb)
* [Hugo Giraudel](http://twitter.com/HugoGiraudel)


## Licence

sass-convert is [unlicensed](http://unlicense.org/).


[sass-convert]: http://sass-lang.com/documentation/#executables
