import fs from 'fs';
import chalk from 'chalk';
import dateformat from 'dateformat';
import vfs from 'vinyl-fs';
import through from 'through2';
import source from 'vinyl-source-stream';
import rename from 'gulp-rename';

import converter from '../lib';

function devLog(...args) {
  console.log(...[
    chalk.styles.inverse.open,
    `[${dateformat(new Date(), 'HH:MM:ss')}]`,
    ...args,
    chalk.styles.inverse.close
  ]);
}

function inspect() {
  let count = 0;

  return through.obj((chunk, enc, cb) => {
    count++;
    cb(null, chunk);
  }, (cb) => {
    devLog(`develop:inspect:count:${count}`);
    cb();
  });
}

function buffer() {
  return new Promise((resolve, reject) => {
    vfs.src('./test/fixture/input/**/*.+(sass|scss|css)')
      .pipe(converter({
        from: 'sass',
        to: 'scss',
      }))
      .on('error', (err) => {
        console.error(err);
        reject(err);
      })
      .pipe(inspect())
      .pipe(vfs.dest('./test/output'))
      .on('end', () => {
        devLog('develop:buffer:end');
        resolve();
      });
  });
}

function stream() {
  return new Promise((resolve, reject) => {
    fs.createReadStream('./test/fixture/input/sass/one.sass')
      .pipe(source('one.sass'))
      .pipe(converter({
        from: 'sass',
        to: 'scss',
      }))
      .on('error', (err) => {
        console.error(err);
        reject(err);
      })
      .pipe(inspect())
      .pipe(rename('one.scss'))
      .pipe(vfs.dest('./test'))
      .on('end', () => {
        devLog('develop:stream:end');
        resolve();
      });
  });
}

(async function () {
  await buffer();
  await stream();
}());
