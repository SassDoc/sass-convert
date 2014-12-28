'use strict';

var fs = require('fs');
var vfs = require('vinyl-fs');
var through = require('through2');
var source = require('vinyl-source-stream');
var rename = require('gulp-rename');

require('traceur-runner');
var converter = require('../lib');

function inspect() {
  return through.obj(function (chunk, enc, cb) {
    console.log(chunk);
    cb(null, chunk);
  });
}

vfs.src('./test/fixture/input/**/*.+(sass|scss|css)')
  .pipe(converter({
    from: 'sass',
    to: 'scss',
  }))
  .on('error', console.error)
  .pipe(inspect())
  .pipe(vfs.dest('./test/output'));

fs.createReadStream('./test/fixture/input/sass/one.sass')
  .pipe(source('one.sass'))
  .pipe(converter({
    from: 'sass',
    to: 'scss',
  }))
  .on('error', console.error)
  .pipe(inspect())
  .pipe(rename('one.scss'))
  .pipe(vfs.dest('./test'));
