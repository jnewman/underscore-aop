module.exports = function (grunt) {
    'use strict';

    var pjson = grunt.file.readJSON('package.json');

    var _ = require('lodash');
    _.filter(_.keys(pjson.devDependencies), function (key) {
        return (/^grunt-/).test(key) && key !== 'grunt-cli';
    }).forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        benchmark: {
            all: {
                // Skip sub folders, so I can keep helpers around.
                src: ['perf/*.js'],
                dest: 'perf/samples.csv'
            },
            options: {
                // This can also be set inside specific tests.
                displayResults: true
            }
        },
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['src/**/*.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        connect: {
            server: {
                options: {
                    port: 8008,
                    base: '.'
                }
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: [
                    'test/*-node.js'
                ]
            }
        },
        'mocha_phantomjs': {
            all: ['test/**/*.html']
        },
        pkg: pjson,
        uglify: {
            options: {
                banner: [
                    '/**',
                    ' * @license',
                    ' * <%= pkg.name %> <%= pkg.version %> <%= pkg.licenses[0].url %>',
                    ' * Build time: <%= grunt.template.today("yyyy-mm-ddTHH:mm:ss") %>',
                    ' * Fork of: dojo/aspect.js 1.8.3 http://dojotoolkit.org/license',
                    ' */\n;'
                ].join('\n')
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }
    });

    grunt.registerTask('perf', ['benchmark:all']);
    grunt.registerTask('test', ['jshint', 'mocha_phantomjs', 'mochaTest']);
    grunt.registerTask('dist', ['concat', 'uglify', 'test']);
};
