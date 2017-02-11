'use strict'

var path = require('path')
var vfs = require('vinyl-fs')
var through = require('through2')
var test = require('tape')
var converter = require('../')

test('rename#true', function (assert) {
  assert.plan(1)

  vfs.src('test/fixture/input/sass/one.sass')
    .pipe(converter({
      from: 'sass',
      to: 'scss',
      rename: true
    }))
    .on('error', function (err) {
      assert.fail(err.message)
      assert.end()
    })
    .pipe(through.obj(function (file, _, cb) {
      var ext = path.extname(file.path)

      assert.equal(
        ext,
        '.scss',
        'Should properly rename .sass file to .scss'
      )

      cb()
    }))
    .on('end', function () {
      assert.pass('Converter successfully run')
      assert.end()
    })
})

test('rename#false', function (assert) {
  assert.plan(1)

  vfs.src('test/fixture/input/scss/one.scss')
    .pipe(converter({
      from: 'scss',
      to: 'sass'
    }))
    .on('error', function (err) {
      assert.fail(err.message)
      assert.end()
    })
    .pipe(through.obj(function (file, _, cb) {
      var ext = path.extname(file.path)

      assert.equal(
        ext,
        '.scss',
        'Should not rename .scss file'
      )

      cb()
    }))
    .on('end', function () {
      assert.pass('Converter successfully run')
      assert.end()
    })
})
