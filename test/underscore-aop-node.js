(function () {
    'use strict';
    require('./underscore-aop')(
        'Require in Node',
        require('chai').assert,
        require('underscore'),
        require('lodash'),
        require('../')
    );
})();
