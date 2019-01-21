(function () {
    'use strict';
    require('./underscore-aop')(
        'Require in Node',
        require('../node_modules/expect.js/index'),
        require('underscore'),
        require('lodash'),
        require('../')
    );
})();
