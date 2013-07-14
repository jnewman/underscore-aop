define(function (require) {
    'use strict';
    var assert = require('chai').assert;

    require('./underscore-aop-test');
    var aop = require('underscore-aop');
    exports.test('AMD in browser', assert, require('underscore'), require('lodash'), aop);

    aop = require('underscore-aop-dist');
    exports.test('AMD in browser min', assert, require('underscore'), require('lodash'), aop);
});
