# grunt-awspublish

> Publish and sync your files to amazon s3

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-awspublish --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-awspublish');
```

## The "awspublish" task

### Overview
In your project's Gruntfile, add a section named `awspublish` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  awspublish: {
    options: {
      key: '...', /* amazon api key */
      secret: '...', /* amazon api secret */
      bucket: '...', /* amazon d3 bucket */
      sync: true, /* optional keep s3 dests in sync with local disk */
      headers: {  /* headers to apply */
        'x-amz-acl': 'public-read',
        'Expires': 'Tue, 07 Oct 2014 12:00:00 GMT',
        'ContentEncoding': 'gzip'
      }
    },
    files: [ /* files key pairs */
      {
        src: [],
        dest: '/foo', /* s3 destination */
        headers: {}   /* override headers */
      }
    ]
  },
})
```

### Options

#### options.sync
Type: `Boolean`
Default value: `false`

Keep s3 dest in sync with local disk (old files will be deleted)

#### options.headers
Type: `Object`
Default value: `{'x-amz-acl': 'public-read'}`

### Usage Examples

```js
grunt.initConfig({
  awspublish: {
    'test1': {
      options: {
        key: '<%= aws.key %>',
        secret: '<%= aws.secret %>',
        bucket: '<%= aws.bucket %>',
        sync: true,
        headers: {
          Expires: 'Tue, 07 Oct 2014 12:00:00 GMT'
        }
      },
      files: [
        {
          expand: true,
          cwd: 'test/fixtures',
          src: 'bar.txt',
          dest: 'test',
          headers: {
            ContentEncoding: 'gzip'
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
})
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
