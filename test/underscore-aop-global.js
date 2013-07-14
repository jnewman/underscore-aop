define(function (require) {
    'use strict';
    var assert = require('chai').assert;

    require('./underscore-aop-test');
    var aop = require('underscore-aop');
    exports.test('Global in browser', assert, require('underscore'), require('lodash'), aop);
});
