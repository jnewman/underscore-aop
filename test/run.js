require({
    paths: {
        'chai': '../node_modules/chai/chai',
        'lodash': '../node_modules/lodash/lodash',
        'mocha': '../node_modules/mocha/mocha',
        'underscore': '../node_modules/underscore/underscore',
        'underscore-aop': '../src/underscore-aop',
        'use': '../contrib/usejs/use',
        'test-underscore-aop': '../test/underscore-aop'
    },

    use: {
        mocha: {
            attach: 'mocha'
        },
        underscore: {
            attach: '_'
        }
    }
});

require([
    'require',
    'lodash',
    'use!mocha'
], function (
    require,
    _,
    mocha
) {
    'use strict';
    _.noConflict();

    mocha.ui('bdd');
    mocha.reporter('html');

    var runner = typeof window !== 'undefined' && window.mochaPhantomJS ?
        window.mochaPhantomJS : mocha;

    require(['test-underscore-aop'], _.bind(runner.run, runner));
});
