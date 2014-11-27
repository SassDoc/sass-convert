'use strict';

var fs = require('fs');
var vfs = require('vinyl-fs');
var test = require('tape');
var rimraf = require('rimraf');
var converter = require('../');

test('before', function (assert) {
  assert.plan(1);

  var stream = vfs.src('test/fixture/input/**/*.+(sass|scss|css)')
    .pipe(converter({
      from: 'sass',
      to: 'scss',
    }))
    .pipe(vfs.dest('test/output'));

  stream.on('error', function (err) {
    assert.fail(err.message);
    assert.end();
  });

  stream.on('end', function () {
    assert.pass();
    assert.end();
  });
});

test('output', function (assert) {
  assert.plan(5);

  assert.ok(
    fs.existsSync('test/output'),
    'Should create an `output` dir'
  );
  assert.ok(
    fs.existsSync('test/output/css'),
    'Should create a `css` dir'
  );
  assert.ok(
    fs.existsSync('test/output/sass'),
    'Should create a `sass` dir'
  );
  assert.ok(
    fs.existsSync('test/output/scss'),
    'Should create a `scss` dir'
  );

  var actual = fs.readFileSync('test/fixture/expected/sass/one.sass', 'utf8');
  var expected = fs.readFileSync('test/output/sass/one.sass', 'utf8');

  assert.equal(
    actual,
    expected,
    'Should properly convert Sass to SCSS'
  );

  assert.end();
});

test('output', function (assert) {
  assert.plan(5);

  assert.ok(
    fs.existsSync('test/output'),
    'Should create an `output` dir'
  );
  assert.ok(
    fs.existsSync('test/output/css'),
    'Should create a `css` dir'
  );
  assert.ok(
    fs.existsSync('test/output/sass'),
    'Should create a `sass` dir'
  );
  assert.ok(
    fs.existsSync('test/output/scss'),
    'Should create a `scss` dir'
  );

  var actual = fs.readFileSync('test/fixture/expected/sass/one.sass', 'utf8');
  var expected = fs.readFileSync('test/output/sass/one.sass', 'utf8');

  assert.equal(
    actual,
    expected,
    'Should properly convert Sass to SCSS'
  );

  assert.end();
});

test('output', function (assert) {
  assert.plan(4);

  assert.ok(
    fs.existsSync('test/output'),
    'Should create an `output` dir'
  );
  assert.ok(
    fs.existsSync('test/output/css'),
    'Should create a `css` dir'
  );
  assert.ok(
    fs.existsSync('test/output/sass'),
    'Should create a `sass` dir'
  );
  assert.ok(
    fs.existsSync('test/output/scss'),
    'Should create a `scss` dir'
  );

  assert.end();
});

test('sass', function (assert) {
  assert.plan(1);

  var actual = fs.readFileSync('test/output/sass/one.sass', 'utf8');
  var expected = fs.readFileSync('test/fixture/expected/sass/one.sass', 'utf8');

  assert.equal(
    actual,
    expected,
    'Should properly convert Sass to SCSS'
  );

  assert.end();
});

test('scss', function (assert) {
  assert.plan(1);

  var actual = fs.readFileSync('test/output/scss/one.scss', 'utf8');
  var expected = fs.readFileSync('test/fixture/input/scss/one.scss', 'utf8');

  assert.equal(
    actual,
    expected,
    'Should not modify SCSS files'
  );

  assert.end();
});

test('css', function (assert) {
  assert.plan(1);

  var actual = fs.readFileSync('test/output/css/one.css', 'utf8');
  var expected = fs.readFileSync('test/fixture/input/css/one.css', 'utf8');

  assert.equal(
    actual,
    expected,
    'Should not modify CSS files'
  );

  assert.end();
});

test('after', function (assert) {
  rimraf('test/output', function () {
    assert.end();
  });
});
