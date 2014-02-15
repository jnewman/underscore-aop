/*globals run:false*/
define(function (require) {
    'use strict';
    require('./underscore-aop');
    var aop = require('underscore-aop');
    run('Global in browser', window.expect, require('underscore'), require('lodash'), aop);
});
