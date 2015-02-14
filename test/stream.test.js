'use strict';

var fs = require('fs');
var vfs = require('vinyl-fs');
var source = require('vinyl-source-stream');
var rename = require('gulp-rename');
var test = require('tape');
var rimraf = require('rimraf');
var converter = require('../');

var read = function (path) {
  return fs.readFileSync(path, 'utf8');
};

test('before', function (assert) {
  assert.plan(1);

  fs.createReadStream('./test/fixture/input/sass/one.sass')
    .pipe(source('one.sass'))
    .pipe(converter({
      from: 'sass',
      to: 'scss',
    }))
    .on('error', function (err) {
      assert.fail(err.message);
      assert.end();
    })
    .pipe(rename('one.scss'))
    .pipe(vfs.dest('./test/output'))
    .on('end', function () {
      assert.pass('Converter successfully run');
      assert.end();
    });
});

test('output#sass', function (assert) {
  assert.plan(1);

  var result = read('test/output/one.scss');
  var expected = read('test/fixture/expected/sass/one.sass');

  assert.equal(
    result,
    expected,
    'Should properly convert Sass to SCSS'
  );

  assert.end();
});

test('after', function (assert) {
  rimraf('test/output', assert.end);
});
