module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-mocha-phantomjs');

    grunt.initConfig({
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
            options: grunt.file.readJSON('.jshintrc')
        },
        mocha_phantomjs: {
            all: ['test/**/*.html']
        },
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %>' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }
    });

    grunt.registerTask('test', ['jshint', 'mocha_phantomjs']);
};