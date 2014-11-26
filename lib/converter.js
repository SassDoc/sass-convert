let path = require('path');
let cp = require('child_process');
let semver = require('semver');
let semverRegex = require('semver-regex');
let dargs = require('dargs');
let through = require('through2');
import * as utils from './utils';
let which = utils.denodeify(require('which'));

const BIN = 'sass-convert';
const MINVERS = '>=3.4.5';

/**
 * Execute command in a child process.
 *
 * @see {@link http://nodejs.org/api/child_process.html}
 * @param {String} command
 * @param {Array} args
 * @return {Promise}
 */
function exec(command, ...args) {
  let deferred = utils.defer();
  let childProcess;

  args.push((err, stdout, stderr) => {
    if (err) {
      deferred.reject(Object.assign(err, {
        message: `${err.message} "${command}" exited with error code ${err.code}`,
        stdout,
        stderr,
      }));
    } else {
      deferred.resolve({
        childProcess,
        stdout,
        stderr,
      });
    }
  });

  childProcess = cp.exec(command, ...args);

  // process.nextTick(() => {
  //   deferred.notify(childProcess);
  // });

  return deferred.promise;
}

/**
 * Custom error for binary check.
 *
 * @param {String} message
 */
class BinaryError extends Error {
  constructor(message) {
    super(message);
    // http://bit.ly/1yMzARU
    this.message = message || `Could not find any executable for "${BIN}". Operation Aborted.`;
  }
  get name() {
    return 'BinaryError';
  }
}

/**
 * Custom error for version check.
 *
 * @param {String} message
 */
class VersionError extends Error {
  constructor(message) {
    super(message);
    // http://bit.ly/1yMzARU
    this.message = message || `Invalid "${BIN}" version, must be ${MINVERS}`;
  }
  get name() {
    return 'VersionError';
  }
}

/**
 * Check whether passed binary (Gem) is in $PATH,
 * and check its version.
 *
 * @param {String} bin
 * @return {Promise}
 */
function checkBinary(bin) {

  /**
   * Check for binary min-version.
   *
   * @param {String} str
   * @return {Boolean}
   */
  function checkVersion(str) {
    let version = str.match(semverRegex())[0];
    return semver.satisfies(version, MINVERS);
  }

  /**
   * Check for global binary and version.
   *
   * @param {String} bin
   * @return {Promise}
   */
  function checkGlobal(bin) {
    return which(bin)
      .then(
        () => exec(`${bin} -v`),
        () => { throw new BinaryError(); }
      )
      .then(res => {
        if (!checkVersion(res.stdout)) {
          throw new VersionError();
        }
      });
  }

  /**
   * Check for bundled binary and version.
   *
   * @param {String} bin
   * @return {Promise}
   */
  function checkBundle(bin) {
    return which('bundle')
      .then(() => exec(`bundle exec ${bin} -v`))
      .then(res => {
        if (!checkVersion(res.stdout)) {
          throw new VersionError();
        }
        return { bundler: true };
      }, err => { throw new BinaryError(); });
  }

  return checkBundle(bin)
    .then(null, () => checkGlobal(bin));
}

/**
 * Run binary checks only once.
 *
 * @return {Promise}
 */
function checkBinaryCache() {
  if (!('promise' in checkBinaryCache)) {
    checkBinaryCache.promise = checkBinary(BIN);
  }

  return checkBinaryCache.promise;
}

class Converter {
  constructor(options) {
    this.options = options || {};
    this.logger = this.options.logger || console;
    this.bundler = false;
  }

  /**
   * Format the `sass-convert` command string.
   *
   * @return {Object}
   */
  command() {
    let cmd = `${this.bundler ? 'bundle exec ': ''}sass-convert`;
    let args = dargs(
      Object.assign(this.options, { 'stdin': true, 'no-cache': true }),
      ['logger']
    );

    return { cmd, args };
  }

  /**
   * Returns whether chunk is eligible for convertion.
   *
   * @param {Buffer} chunk - Vinyl file
   * @return {Boolean}
   */
  isTransformable(chunk) {
    let ext = path.extname(chunk.path);
    return chunk.isBuffer() && ext.endsWith(this.options.from);
  }

  /**
   * Convert file Buffer through `sass-convert` binary.
   *
   * @param {Buffer} file - Vinyl file
   * @param {String} enc - encoding
   */
  convertFile(file, enc) {
    let deferred = utils.defer();
    let { cmd, args } = this.command();
    let child = cp.spawn(cmd, args);
    let converted;

    child.stdin.setEncoding(enc);
    child.stdin.write(file.contents);
    child.stdin.end();

    child.stdout.setEncoding(enc);
    child.stdout.on('data', data => {
      converted = data;
    });

    child.on('error', err => {
      deferred.reject(err);
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        deferred.resolve(converted);
      }
    });

    return deferred.promise;
  }

  /**
   * Returns a transform stream meant to be piped in a stream
   * of Sass, SCSS or CSS files. Apply convertion if matches.
   *
   * @return {Object} - Stream
   */
  stream() {
    return through.obj((chunk, enc, cb) => {
      if (!this.isTransformable(chunk)) {
        // Pass-through.
        return cb(null, chunk);
      }

      // Matches `from`, let's convert it.
      checkBinaryCache()
        .then(res => {
          this.bundler = res ? res.bundler : false;

          return this.convertFile(chunk, enc);
        })
        .then(converted => {
          chunk.contents = new Buffer(converted);
          cb(null, chunk);
        }, err => {
          this.logger.log(err.message);
          cb(err);
        });
    });
  }
}

module.exports = function (options) {
  return new Converter(options).stream();
}
