'use strict';

var grunt = require('grunt'),
    fs = require('fs'),
    knox = require('knox'),
    _ = require('lodash');


exports.awspublish = {

  setUp: function(done) {
    fs.writeFileSync(__dirname + '/fixtures/bar.txt',
      'hello hello I dont know why I say goodbye i say hello ' + new Date());

    fs.writeFileSync(__dirname + '/fixtures/foo.html',
      '<html><head><title>foo ' +
      new Date() +
      '</title></head><body>'
    );
    done();
  },

  test1: function(test) {
    var client = knox.createClient(grunt.config.data.aws);
    client.list({ prefix: 'test' }, function (err, data) {
      var files = _.map(data.Contents, 'Key');
      test.equal(null, err);
      test.equal(3, files.length);
      test.done();
    });
  }
};
