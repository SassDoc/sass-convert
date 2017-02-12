import path from 'path'
import { exec, spawn } from 'child_process'
import semver from 'semver'
import semverRegex from 'semver-regex'
import dargs from 'dargs'
import through from 'through2'
import concat from 'concat-stream'
import which from 'which'
import assign from 'object-assign'
import endsWith from 'ends-with'
import memoize from 'memoize-decorator'
import { Promise } from 'es6-promise'
import denodeify from 'es6-denodeify'

const promiseify = denodeify(Promise)
const whichp = promiseify(which)

const BIN = 'sass-convert'
const MINVERS = '>=3.4.5'

/**
 * Execute command in a child process.
 *
 * @see {@link http://nodejs.org/api/child_process.html}
 * @param {String} command
 * @param {Array} args
 * @return {Promise}
 */
function execp (command, ...args) {
  let childProcess

  return new Promise((resolve, reject) => {
    args.push((err, stdout, stderr) => {
      if (err) {
        assign(err, {
          message: `${err.message} \`${command}\` exited with error code ${err.code}`,
          stdout,
          stderr
        })

        reject(err)
      } else {
        resolve({ childProcess, stdout, stderr })
      }
    })

    childProcess = exec(command, ...args)
  })
}

/**
 * Custom error for binary check.
 *
 * @param {String} message
 */
class BinaryError extends Error {
  constructor (message) {
    super(message)
    // http://bit.ly/1yMzARU
    this.message = message || `Could not find any executable for "${BIN}". Operation Aborted.`
  }

  get name () {
    return 'BinaryError'
  }
}

/**
 * Custom error for version check.
 *
 * @param {String} message
 */
class VersionError extends Error {
  constructor (message) {
    super(message)
    // http://bit.ly/1yMzARU
    this.message = message || `Invalid "${BIN}" version, must be ${MINVERS}`
  }

  get name () {
    return 'VersionError'
  }
}

/**
 * Check whether passed binary (Gem) is in $PATH,
 * and check its version.
 *
 * @param {String} bin
 * @return {Promise}
 */
function checkBinary (bin) {
  /**
   * Check for binary min-version.
   *
   * @param {String} str
   * @return {Boolean}
   */
  function checkVersion (str) {
    let version = str.match(semverRegex())[0]
    return semver.satisfies(version, MINVERS)
  }

  /**
   * Check for global binary and version.
   *
   * @return {Promise}
   */
  function checkGlobal () {
    return whichp(bin)
      .then(
        () => execp(`${bin} -v`),
        () => { throw new BinaryError() }
      )
      .then(res => {
        if (!checkVersion(res.stdout)) {
          throw new VersionError()
        }
      })
  }

  /**
   * Check for bundled binary and version.
   *
   * @return {Promise}
   */
  function checkBundle () {
    return whichp('bundle')
      .then(() => execp(`bundle exec ${bin} -v`))
      .then(res => {
        if (!checkVersion(res.stdout)) {
          throw new VersionError()
        }
        return { bundler: true }
      }, (err) => { throw new BinaryError() }) // eslint-disable-line
  }

  return checkBundle()
    .catch(checkGlobal)
}

/**
 * Run binary checks only once.
 *
 * @return {Promise}
 */
function checkBinaryCache () {
  if (!('promise' in checkBinaryCache)) {
    checkBinaryCache.promise = checkBinary(BIN)
  }

  return checkBinaryCache.promise
}

class Converter {
  constructor (options = {}) {
    this.options = options
    this.bundler = false
  }

  /**
   * Format the `sass-convert` command string.
   *
   * @return {Object}
   */
  @memoize
  get command () {
    let cmd = `${this.bundler ? 'bundle exec ' : ''}sass-convert`

    // Add required args.
    let options = assign({}, this.options, {
      'stdin': true,
      'no-cache': true
    })

    // Filter unwanted or erroneous args.
    let includes = [
      'from',
      'to',
      'dasherize',
      'indent',
      'old',
      'default-encoding',
      'unix-newlines',
      'stdin',
      'no-cache'
    ]

    let args = dargs(options, { includes })

    return { cmd, args }
  }

  /**
   * Returns whether file is eligible for convertion.
   *
   * @param {Object} file - Vinyl file Object
   * @return {Boolean}
   */
  isTransformable (file) {
    let ext = path.extname(file.path)
    return (file.isBuffer() || file.isStream()) && endsWith(ext, this.options.from)
  }

  /**
   * Convert file Buffer through `sass-convert` binary.
   *
   * @param {Buffer} file - Vinyl file
   * @param {String} enc - encoding
   * @return {Promise}
   */
  convertFile (file, enc) {
    let { cmd, args } = this.command
    let child = spawn(cmd, args)
    let result = {}

    file.pipe(child.stdin)

    child.stdout.pipe(concat(data => {
      result.stdout = data
    }))

    child.stderr.pipe(concat(data => {
      result.stderr = data
    }))

    return new Promise((resolve, reject) => {
      child.on('error', reject)

      child.on('close', (code, signal) => {
        if (code !== 0) {
          let message = `\`${cmd} ${args.join(' ')}\` failed with code ${code}`
          let stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString() : ''

          reject({ code, message, stderr })
        } else {
          resolve(result)
        }
      })
    })
  }

  /**
   * Change file extension to `options.from`.
   *
   * @param {Object} file - Vinyl file
   */
  rename (file) {
    if (!this.options.rename) {
      return
    }

    let ext = path.extname(file.path)
    file.path = file.path.replace(ext, `.${this.options.to}`)
  }

  /**
   * Returns a transform stream meant to be piped to a stream
   * of Sass, SCSS or CSS files. Apply convertion if matches.
   *
   * @return {Object} - Stream
   */
  stream () {
    let self = this

    return through.obj(function (file, enc, cb) {
      let stream = this

      if (!self.isTransformable(file)) {
        // Pass-through.
        return cb(null, file)
      }

      // Matches `from`, let's convert it.
      checkBinaryCache()
        .then(res => {
          self.bundler = res ? res.bundler : false

          return self.convertFile(file, enc)
        })
        .then(result => {
          file.contents = new Buffer(result.stdout)
          self.rename(file)

          cb(null, file)
        }, err => {
          stream.emit('error', err)

          if (self.options.force) {
            // Continue stream chain,
            // but don't pass unconverted chunks.
            return cb()
          }

          // Stop stream chain.
          stream.destroy()
          stream.emit('end')
        })
    })
  }
}

module.exports = function (options) {
  return new Converter(options).stream()
}

// Expose custom error constructors.
module.exports.BinaryError = BinaryError
module.exports.VersionError = VersionError
