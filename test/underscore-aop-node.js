(function () {
    'use strict';
    require('./underscore-aop')(
        'Require in Node',
        require('../bower_components/expect/expect'),
        require('underscore'),
        require('lodash'),
        require('../')
    );
})();
