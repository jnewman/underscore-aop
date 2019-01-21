//noinspection ThisExpressionReferencesGlobalObjectJS
(function (global) {
    'use strict';

    var TESTS = [
        'test/underscore-aop-amd',
        'test/underscore-aop-global'
    ];

    require({
        paths: {
            expect: '../node_modules/expect.js/index',
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

        require(TESTS, function() {
            if (typeof global !== 'undefined' && global.initMochaPhantomJS) {
                global.initMochaPhantomJS();
            } else {
                mocha.run();
            }
        });
    });
})(this || window);
