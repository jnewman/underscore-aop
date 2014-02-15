/*globals run:false,window:false*/
define(function (require, exports) {
    'use strict';
    var aop = require('underscore-aop');
    require('expect');
    var expect = window.expect; // expect seems to export in an unusual way.
    var lodash = require('lodash');
    var underscore = require('underscore');
    require('./underscore-aop');

    run('AMD in browser', expect, underscore, lodash, aop);
    run('AMD in browser min', expect, underscore, lodash, aop);
});
