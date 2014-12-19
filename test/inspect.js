'use strict';

var through = require('through2');
var vfs = require('vinyl-fs');

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
  .on('error', function (err) {
    console.error(err);
  })
  .pipe(inspect())
  .pipe(vfs.dest('./test/output'));
