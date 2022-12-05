/**
 * Library for storing and editing data
 */

const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')

// Base directory of data
const baseDir = path.join(__dirname, '/../.data')

/**
 * @desc Write a file to filesystem
 * @param {string} dir directory
 * @param {string} file filename
 * @param {*} data
 * @param callback {(error: string | boolean) => void}
 */
const createData = function(dir, file, data, callback) {
  // Open file to write
  fs.open(baseDir + '/' + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert payload to string
      const stringData = JSON.stringify(data)

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false)
            } else {
              callback('Error closing new false.')
            }
          })
        } else {
          callback('Error writing to new file.')
        }
      })

    } else {
      callback('Could not create new file. File may already exist.')
    }
  })
}

/**
 * @desc Read data of a file from filesystem
 * @param {string} dir
 * @param {string} file
 * @param callback {(error: Error | boolean, data: any) => void}
 */
const readData = function(dir, file, callback) {
  fs.readFile(baseDir + '/' + dir + '/' + file + '.json', 'utf8', (err, data) => {
    if (err || !data) {
      callback(err, data)
    } else {
      callback(false, helpers.parseJsonToObject(data))
    }
  })
}

/**
 * @desc Update data of a file from filesystem
 * @param {string} dir directory
 * @param {string} file filename
 * @param {*} data
 * @param callback {(error: string | boolean) => void}
 */
const updateData = function(dir, file, data, callback) {
  fs.open(baseDir + '/' + dir + '/' + file + '.json', 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data)

      // Truncate, not overwrite, file
      fs.ftruncate(fileDescriptor, (err) => {
        if (!err) {
          // Write to the file
          fs.writeFile(fileDescriptor, stringData, (err) => {
            if (!err) {
              // Close the file
              fs.close(fileDescriptor, (err) => {
                if (!err) {
                  callback(false)
                } else {
                  callback('There was an error closing the file.')
                }
              })
            } else {
              callback('Error writing to the existing file')
            }
          })
        } else {
          callback('There was an error truncating the file.')
        }
      })
    } else {
      callback('Could not open the file to update. File may not exist.')
    }
  })
}

/**
 * @desc Delete a file in the filesystem
 * @param {string} dir directory
 * @param {string} file filename
 * @param callback {(error: string | boolean) => void}
 */
const deleteData = function(dir, file, callback) {
  // Unlink the file from the filesystem
  fs.unlink(baseDir + '/' + dir + '/' + file + '.json', (err) => {
    if (!err) {
      callback(false)
    } else {
      callback('Error deleting file.')
    }
  })
}

/**
 * @desc List all items in a directory
 * @param dir {string} Directory
 * @param callback {(error: Error | boolean, listData: string[]) => void}
 */
const listData = function(dir, callback) {
  fs.readdir(baseDir + '/' + dir + "/", (err, data) => {
    if (err || !data || data.length <= 0) {
      return callback(err, data);
    }

    const trimmedFileNames = data.map((fileName) => fileName.replace('.json', ''))

    return callback(false, trimmedFileNames);
  })
}

module.exports = {
  create: createData,
  read: readData,
  update: updateData,
  delete: deleteData,
  list: listData
}