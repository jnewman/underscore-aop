define(function (require) {
    'use strict';
    var assert = require('chai').assert;

    require('./underscore-aop');
    var aop = require('underscore-aop');
    module.exports('AMD in browser', assert, require('underscore'), require('lodash'), aop);

    aop = require('underscore-aop-dist');
    module.exports('AMD in browser min', assert, require('underscore'), require('lodash'), aop);
});
