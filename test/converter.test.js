'use strict';

var fs = require('fs');
var vfs = require('vinyl-fs');
var test = require('tape');
var readdirp = require('readdirp');
var rimraf = require('rimraf');
var converter = require('../');

var exist = fs.existsSync;
var read = function (path) {
  return fs.readFileSync(path, 'utf8');
}

test('before', function (assert) {
  assert.plan(1);

  vfs.src('test/fixture/input/**/*.+(sass|scss|css)')
    .pipe(converter({
      from: 'sass',
      to: 'scss',
    }))
    .on('error', function (err) {
      assert.fail(err.message);
      assert.end();
    })
    .pipe(vfs.dest('test/output'))
    .on('end', function () {
      assert.pass('Converter successfully run');
      assert.end();
    });

});

test('output#structure', function (assert) {
  assert.plan(5);

  assert.ok(
    exist('test/output'),
    'Should create an `output` dir'
  );
  assert.ok(
    exist('test/output/css'),
    'Should create a `css` dir'
  );
  assert.ok(
    exist('test/output/sass'),
    'Should create a `sass` dir'
  );
  assert.ok(
    exist('test/output/scss'),
    'Should create a `scss` dir'
  );

  var result = [];
  var expected = [
    'css/one.css',
    'css/two.css',
    'sass/one.sass',
    'sass/two.sass',
    'scss/one.scss',
    'scss/two.scss',
  ];

  readdirp({ root: 'test/output', fileFilter: '**/*.+(sass|scss|css)' })
    .on('data', function (entry) {
      result.push(entry.path);
    })
    .on('end', function () {
      assert.deepEqual(result.sort(), expected.sort(), 'All chunks should pass through');
      assert.end();
    });
});

test('output#sass', function (assert) {
  assert.plan(1);

  var result = read('test/output/sass/one.sass');
  var expected = read('test/fixture/expected/sass/one.sass');

  assert.equal(
    result,
    expected,
    'Should properly convert Sass to SCSS'
  );

  assert.end();
});

test('output#scss', function (assert) {
  assert.plan(1);

  var result = read('test/output/scss/one.scss');
  var expected = read('test/fixture/input/scss/one.scss');

  assert.equal(
    result,
    expected,
    'Should not modify SCSS files'
  );

  assert.end();
});

test('output#css', function (assert) {
  assert.plan(1);

  var result = read('test/output/css/one.css');
  var expected = read('test/fixture/input/css/one.css');

  assert.equal(
    result,
    expected,
    'Should not modify CSS files'
  );

  assert.end();
});

test('after', function (assert) {
  rimraf('test/output', assert.end);
});
