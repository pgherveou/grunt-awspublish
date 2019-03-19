'use strict';

/**
 * module deps
 */

var crypto = require('crypto'),
    knox = require('knox'),
    mime = require('mime'),
    async = require('async'),
    _ = require('lodash'),
    zlib = require('zlib');

/*
 * grunt-awspublish
 * https://github.com/pgherveou/awspublish
 *
 * awspublish: {
 *   options: {
 *     key: '...',
 *     secret: '...',
 *     bucket: '...',
 *     sync: true,
 *     headers: {
 *       'x-amz-acl': 'public-read',
 *       'Expires': 'ddd, DD MMM YYYY 12:00:00 GMT',
 *       Content-Encoding: 'gzip'
 *     }
 *   },
 *   files: [
 *     {
 *       src: [],
 *       dest: '/foo',
 *       headers: {}
 *     }
 *   ]
 * }
 *
 * Copyright (c) 2013 PG
 * Licensed under the MIT license.
 */

// build [file: '', dest: '', params: {}]


module.exports = function (grunt) {

  /**
   * calculate file hash
   * @param  {Buffer} buf
   * @return {String}
   *
   * @api private
   */

  function md5Hash(buf) {
    return crypto
      .createHash('md5')
      .update(buf)
      .digest('hex');
  }

  /**
   * check if file is identical to the one on s3
   * @param  {Knox}   client
   * @param  {String} file
   * @param  {Function} cb
   *
   * @api private
   */

  function isIdentical (client, task, cb) {
    client.headFile(task.dest, function(err, res) {
      if (err) return cb(err);
      var buf = grunt.file.read(task.file, {encoding: null}),
          identical = ('"' + md5Hash(buf) + '"') === res.headers.etag;

      // print state
      if (identical) {
        grunt.log.writeln('[skip]    ' + task.file);
      } else if (res.headers.etag) {
        grunt.log.writeln('[UPDATE]  ' + task.file);
      } else {
        grunt.log.writeln('[ADD]     ' + task.file);
      }
      cb(err, identical, buf);
    });
  }

  /**
   * upload a file to s3
   * @param  {Knox}     client
   * @param  {Buffer}   buffer
   * @param  {String}   dest
   * @param  {Object}   headers
   * @param  {Function} cb
   *
   * @api private
   */

  function upload (client, buffer, dest, headers, cb) {
    var req = client.put(dest, headers);
    req.on('response', function (res) {
      if (199 < res.statusCode && res.statusCode < 299) {
        grunt.verbose.writeln('file saved to %s', req.url);
        cb();
      } else {
        cb(res);
      }
    });
    req.end(buffer);
  }

  /**
   * process file
   * @param  {Knox}   client
   * @param  {Object} options
   * @param  {Function} cb
   * @return {[type]}
   *
   * @api private
   */

  function processFile (client, task, cb) {
    var tasks = [];

    // check file status
    isIdentical(client, task, function (err, identical, buf) {

      // skip if file is identical
      if (identical) return cb();

      // add content-type header
      task.headers['Content-Type'] = mime.getType(task.file);

      // public by default
      if(!task.headers['x-amz-acl']) {
        task.headers['x-amz-acl'] = 'public-read';
      }

      // zip task
      if (task.headers['Content-Encoding'] === 'gzip') {
        tasks.push(
          function(cb) {
            zlib.gzip(buf, function(err, buf) {
              if (err) return cb(err);
              var headers = _.clone(task.headers);
              headers['Content-Length'] = buf.length;
              grunt.verbose.writeln('(gzip) upload task:');
              grunt.verbose.writeln('file:', task.file);
              grunt.verbose.writeln('headers:\n', headers);
              upload(client, buf, task.dest + 'gz', headers, cb);
            });
          }
        );
      }

      // unzip task
      tasks.push(function(cb) {
        var headers = _.clone(task.headers);
        headers['Content-Length'] = buf.length;
        delete headers['Content-Encoding'];
        grunt.verbose.writeln('upload task:');
        grunt.verbose.writeln('file:', task.file);
        grunt.verbose.writeln('headers:\n', headers);
        upload(client, buf, task.dest, headers, cb);
      });

      async.parallel(tasks, cb);

    });
  }

  /**
   * delete existing s3 files that are not on the local disk anymore
   *
   * @param  {Knox}   client
   * @param  {Array}   localFiles
   * @param  {String}   prefix
   * @param  {Function} cb
   *
   * @api private
   */

  function deleteMultiple (client, localFiles, prefix, ignore, cb) {

    // list remote files
    client.list({prefix: prefix}, function (err, data) {
      var s3Files = _.map(data.Contents, 'Key'),
          removeList = _.reject(s3Files, function (file) {

            // quick fix for gzip files
            if (file.slice(file.length - 2) === 'gz') {
              file = file.slice(0, file.length - 2);
            }

            // check if file exist in local dir
            return localFiles.indexOf(file) !== -1;
          });

      // reject files matching ignore pattern
      removeList = _.reject(removeList, function (f) {
        return grunt.file.isMatch(ignore, f);
      });

      // remove files
      if (removeList.length) {
        grunt.log.writeln('[DELETE]  ' + removeList);
        client.deleteMultiple(removeList, cb);
      } else {
        cb();
      }
    });
  }

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('awspublish', 'Publish and sync your files to amazon s3', function() {

    // make file public by default
    var options = this.options({syncIgnore : ''}),
      client = knox.createClient(options),
      flowActions = [], deleteActions = [],
      tasks = [];

    grunt.log.writeln('Bucket: ', options.bucket);

    // iterate over all files pairs
    this.files.forEach(function (f) {
      var dest = f.dest,
          prefix = f.orig.dest,
          headers = _.extend({}, options.headers, f.headers);

      // iterate over each src
      f.src.forEach(function (src) {

        // create upload task
        tasks.push({
          prefix: prefix,
          file: src,
          dest: dest,
          headers: headers
        });
      });
    });

    // register upload action
    flowActions.push(function (cb) {

      // Iterate over all specified file groups.
      async.forEachLimit(tasks, 5, function (task, cb) {
        processFile(client, task, cb);
      }, cb);
    });

    // delete old s3 files?
    if (options.sync) {
      // get all files by prefix
      var prefixes = _.groupBy(tasks, 'prefix');

      // loop over each prefix
      Object.keys(prefixes).forEach(function (prefix) {

        // get local files
        var localFiles = _.map(prefixes[prefix], 'dest');

        // add delete action
        deleteActions.push(function (cb) {
          deleteMultiple(client, localFiles, prefix, options.syncIgnore, cb);
        });
      });

      // register delete action
      flowActions.push(function (cb) {
        async.parallel(deleteActions, cb);
      });
    }

    // exec upload actions then delete actions
    async.series(flowActions, this.async());

  });
};
