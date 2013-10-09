'use strict';

var grunt = require('grunt'),
    knox = require('knox'),
    _ = grunt.util._;

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.awsPublish = {
  setUp: function(done) {
    // setup here if necessary
    done();
  },

  test1: function(test) {
    var client = knox.createClient(grunt.config.data.aws);
    client.list({ prefix: 'test' }, function (err, data) {
      var files = _.map(data.Contents, 'Key');
      test.equal(null, err);
      test.equal(2, files.length);
      test.equal('test/bar.txt', files[0]);
      test.equal('test/foo.html', files[1]);
      test.done();
    });
  }
};
