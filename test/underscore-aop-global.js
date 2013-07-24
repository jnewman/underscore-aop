define(function (require) {
    'use strict';
    var assert = require('chai').assert;

    require('./underscore-aop');
    var aop = require('underscore-aop');
    module.exports('Global in browser', assert, require('underscore'), require('lodash'), aop);
});
