module.exports = function (grunt) {

    grunt.initConfig({

        mocha: {
            main: {
                src: 'test/spec.js'
            }
        },

        watch: {
            test: {
                files: ['test/*'],
                tasks: 'test'
            }
        }

    });

    grunt.loadNpmTasks('grunt-mocha');
    grunt.registerTask('test', 'mocha');

};