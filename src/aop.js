var _ = require('underscore');

exports.aop = {
    around: function (obj, methodName, advise) {
        var origMethod = obj[methodName];
        obj[methodName] = _.wrap(origMethod, advise);
        return {
            remove: function () {
                //noinspection JSHint
                return obj[methodName] = origMethod;
            }
        };
    }
};
