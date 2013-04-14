define(['lodash'], function (_) {
    return {
        around: function (obj, methodName, advise) {
            var origMethod = obj[methodName];
            obj[methodName] = _.wrap(origMethod, advise);
            return {
                remove: function () {
                    obj[methodName] = origMethod;
                    return origMethod;
                }
            };
        }
    };
});
