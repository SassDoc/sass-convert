let path = require('path');
let cp = require('child_process');
let semver = require('semver');
let semverRegex = require('semver-regex');
let dargs = require('dargs');
let through = require('through2');
let concat = require('concat-stream');
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
      Object.assign(err, {
        message: `${err.message} \`${command}\` exited with error code ${err.code}`,
        stdout,
        stderr,
      });

      deferred.reject(err);
    }
    else {
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
   * @return {Promise}
   */
  function checkGlobal() {
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
   * @return {Promise}
   */
  function checkBundle() {
    return which('bundle')
      .then(() => exec(`bundle exec ${bin} -v`))
      .then(res => {
        if (!checkVersion(res.stdout)) {
          throw new VersionError();
        }
        return { bundler: true };
      }, err => { throw new BinaryError(); });
  }

  return checkBundle()
    .then(null, checkGlobal);
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
    this.bundler = false;
  }

  /**
   * Format the `sass-convert` command string.
   *
   * @return {Object}
   */
  command() {
    let cmd = `${this.bundler ? 'bundle exec ' : ''}sass-convert`;

    // Add required args.
    let options = Object.assign(this.options, {
      'stdin': true,
      'no-cache': true,
    });

    // Filter unwanted or erroneous args.
    let allowed = [
      'from',
      'to',
      'dasherize',
      'indent',
      'old',
      'default-encoding',
      'unix-newlines',
      'stdin',
      'no-cache',
    ];

    let args = dargs(options, [], allowed);

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
    let { cmd, args } = this.cmdCache || (this.cmdCache = this.command());
    let child = cp.spawn(cmd, args);
    let result = {};

    file.pipe(child.stdin);

    child.stdout.pipe(concat(data => {
      result.stdout = data;
    }));

    child.stderr.pipe(concat(data => {
      result.stderr = data;
    }));

    child.on('error', deferred.reject);

    child.on('close', (code, signal) => {
      if (code !== 0) {
        let message = `\`${cmd} ${args.join(' ')}\` failed with code ${code}`;
        let stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString() : '';

        deferred.reject({ code, message, stderr });
      }
      else {
        deferred.resolve(result);
      }
    });

    return deferred.promise;
  }

  /**
   * Returns a transform stream meant to be piped to a stream
   * of Sass, SCSS or CSS files. Apply convertion if matches.
   *
   * @return {Object} - Stream
   */
  stream() {
    let self = this;

    return through.obj(function (chunk, enc, cb) {
      let stream = this;

      if (!self.isTransformable(chunk)) {
        // Pass-through.
        return cb(null, chunk);
      }

      // Matches `from`, let's convert it.
      checkBinaryCache()
        .then(res => {
          self.bundler = res ? res.bundler : false;

          return self.convertFile(chunk, enc);
        })
        .then(result => {
          chunk.contents = new Buffer(result.stdout);

          cb(null, chunk);
        }, err => {
          stream.emit('error', err);

          if (self.options.force) {
            // Continue stream chain,
            // but don't pass unconverted chunks.
            return cb();
          }

          // Stop stream chain.
          stream.destroy();
          stream.emit('end');
        });
    });
  }
}

module.exports = function (options) {
  return new Converter(options).stream();
};

// Expose custom error constructors.
module.exports.BinaryError = BinaryError;
module.exports.VersionError = VersionError;
