/**
 * @module LogsLibrary
 * @desc Library for storing and rotating logs
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const baseDir = path.join(__dirname, '/../.logs/')

/**
 * @name Append
 * @desc append a string to a file. Create the file if it does not exist
 * @param filename {string} Name of file
 * @param string {string} String of data to append
 * @param callback {Function}
 * @return void
 */
function append(filename, string, callback) {
  fs.open(baseDir + filename + '.log', 'a', (err, fileDescriptor) => {
    if (err || !fileDescriptor) {
      return callback('Could not open file for appending')
    }

    // Append to the file and close the file
    fs.appendFile(fileDescriptor, string + '\n', (err) => {
      if (err) {
        return callback('Error appending to file')
      }

      fs.close(fileDescriptor, (err) => {
        if (err) {
          return callback('Error closing file that was being appended')
        }
        return callback(false)
      })
    })
  })
}

/**
 * @name List
 * @desc List all the logs, and optionally include the compressed logs
 * @param includeCompressedLogs {boolean}
 * @param callback {Function}
 */
function list(includeCompressedLogs, callback) {
  fs.readdir(baseDir, (err, data) => {
    if (err || !data || !data.length) {
      return callback(err, data)
    }

    const trimmedFilenames = []

    for (let fileName of data) {
      // Add .log files
      if (fileName.includes('.log')) {
        trimmedFilenames.push(fileName.replace('.log', ''))
      }

      // Add .gz.b64 files
      if (fileName.includes('.gz.b64') && includeCompressedLogs) {
        trimmedFilenames.push(fileName.replace('.gz.b64', ''))
      }
    }

    return callback(false, trimmedFilenames)
  })
}

/**
 * @name Compress
 * @desc Compress the contents of the one .log file into a .gz.b64 file within
 *   the same directory
 * @param logId {string}
 * @param newFileId {string}
 * @param callback {(error: Error | false) => void}
 */
function compress(logId, newFileId, callback) {
  const sourceFile = logId + '.log'
  const targetFile = newFileId + '.gz.b64'

  // Read the source file
  fs.readFile(baseDir + sourceFile, 'utf-8', (err, input) => {
    if (err || !input) {
      return callback(err)
    }

    // Compress the data using gzip
    zlib.gzip(input, (err, buffer) => {
      if (err || !buffer) {
        return callback(err)
      }

      // Send the data to the destination file
      fs.open(baseDir + targetFile, 'wx', (err, fileDescriptor) => {
        if (err || !fileDescriptor) {
          return callback(err)
        }

        // Write to the destination file
        fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
          if (err) {
            return callback(err)
          }

          fs.close(fileDescriptor, (err) => {
            if (err) {
              return callback(err)
            }

            return callback(false)
          })
        })
      })
    })
  })
}

/**
 * @name Decompress
 * @param fileId {string}
 * @param callback {(err: Error | false, string?: string) => void}
 * @return void
 */
function decompress(fileId, callback) {
  const fileName = fileId + '.gz.b64'

  fs.readFile(baseDir + fileName, 'utf-8', (err, string) => {
    if (err || !string) {
      return callback(err)
    }

    // Decompress the data
    const inputBuffer = Buffer.from(string, 'base64')

    zlib.unzip(inputBuffer, (err, outputBuffer) => {
      if (err || !outputBuffer) {
        return callback(err)
      }

      return callback(false, outputBuffer.toString())
    })
  })
}

/**
 * @name Truncate
 * @param logId {string}
 * @param callback {(err: Error | false) => void}
 * @return void
 */
function truncate(logId, callback) {
  fs.truncate(baseDir + logId + '.log', 0, (err) => {
    if (err) {
      return callback(err)
    }

    return callback(false)
  })
}


module.exports = {
  append,
  compress,
  decompress,
  list,
  truncate,
}
