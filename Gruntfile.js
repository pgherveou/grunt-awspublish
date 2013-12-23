/*
 * grunt-awspublish
 * https://github.com/pgherveou/awspublish
 *
 * Copyright (c) 2013 PG
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    aws: grunt.file.readJSON('aws-credentials.json'),

    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
    },

    // Configuration to be run (and then tested).
    awspublish: {
      'test1': {
        options: {
          key: '<%= aws.key %>',
          secret: '<%= aws.secret %>',
          bucket: '<%= aws.bucket %>',
          sync: true,
          syncIgnore: ['test/ignore-me/**'],
          headers: {
            foo: 'bar'
          }
        },
        files: [
          {
            expand: true,
            cwd: 'test/fixtures',
            src: 'bar.txt',
            dest: 'test',
            headers: {
              'Content-Encoding': 'gzip'
            }
          },
          {
            expand: true,
            cwd: 'test/fixtures',
            src: 'foo.html',
            dest: 'test'
          }
        ]
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'awspublish', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
