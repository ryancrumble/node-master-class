/**
 * Library for storing and editing data
 */

const fs = require('fs');
const path = require('path');
const helpers = require("./helpers");


// Container
const lib = {};

// Base directory of data
lib.baseDir = path.join(__dirname, '/../.data');

// Write data to a file
lib.create = function (dir, file, data, callback) {
    // Open file to write
    fs.open(lib.baseDir + '/' + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert payload to string
            const stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new false.');
                        }
                    });
                } else {
                    callback('Error writing to new file.');
                }
            });

        } else {
            callback('Could not create new file. File may already exist.');
        }
    });
};

lib.read = function (dir, file, callback) {
    fs.readFile(lib.baseDir + '/' + dir + '/' + file + '.json', 'utf8', (err, data) => {
        if (err || !data) {
            callback(err, data);
        } else {
            callback(false, helpers.parseJsonToObject(data));
        }
    });
};

lib.update = function (dir, file, data, callback) {
    fs.open(lib.baseDir + '/' + dir + '/' + file + '.json', 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);

            // Truncate, not overwrite, file
            fs.ftruncate(fileDescriptor, (err) => {
                if (!err) {
                    // Write to the file
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            // Close the file
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('There was an error closing the file.');
                                }
                            });
                        } else {
                            callback('Error writing to the existing file');
                        }
                    });
                } else {
                    callback('There was an error truncating the file.');
                }
            });
        } else {
            callback('Could not open the file to update. File may not exist.');
        }
    });
};

lib.delete = function (dir, file, callback) {
    // Unlink the file from the filesystem
    fs.unlink(lib.baseDir + '/' + dir + '/' + file + '.json', (err) => {
        if (!err) {
            callback(false);
        } else {
            callback('Error deleting file.');
        }
    });
};

module.exports = lib;