(function () {
    'use strict';
    require('./underscore-aop-test').test(
        'Require in Node',
        require('chai').assert,
        require('underscore'),
        require('lodash'),
        require('../')
    );
})();
