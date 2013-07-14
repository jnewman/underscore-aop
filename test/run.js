//noinspection ThisExpressionReferencesGlobalObjectJS
(function (global) {
    'use strict';

    var TESTS = [
        'test/underscore-aop-amd',
        'test/underscore-aop-global'
    ];

    require({
        paths: {
            chai: '../node_modules/chai/chai',
            lodash: '../node_modules/lodash/lodash',
            mocha: '../node_modules/mocha/mocha',
            test: '.',
            underscore: '../node_modules/underscore/underscore',
            'underscore-aop': '../src/underscore-aop',
            'underscore-aop-dist': '../dist/underscore-aop.min'
        },

        shim: {
            mocha: {
                exports: 'mocha'
            },
            underscore: {
                exports: '_'
            }
        }
    });

    require(['require', 'lodash', 'mocha', 'underscore'], function (require, _, mocha) {
        _.noConflict();

        mocha.ui('bdd');
        mocha.reporter('html');

        //noinspection JSUnresolvedVariable
        var runner = typeof window !== 'undefined' && global.mochaPhantomJS ?
            global.mochaPhantomJS : mocha;

        require(TESTS, _.bind(runner.run, runner));
    });
})(this);
