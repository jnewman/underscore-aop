/**
 * @license
 * Underscore-AOP 0.2.1
 *
 * Available under BSD3 license <https://github.com/jnewman/underscore-aop/blob/master/LICENSE.txt>
 */
(function (factory) {
    'use strict';
    var amd = typeof define === 'function' && define.amd;
    /** Detect free variable `exports` */
    var freeExports = typeof exports == 'object' && exports;

    /** Detect free variable `module` */
    var freeModule = typeof module == 'object' && module && module.exports == freeExports && module;

    var findUnderscoreLike = function () {
        var underscoreLike;
        try {
            underscoreLike = require('underscore');
        }
        catch (e) {
            try {
                underscoreLike = require('lodash');
            } catch (e) {
                underscoreLike = window._;
            }
        }

        if (typeof underscoreLike !== 'function')  {
            throw new TypeError('underscoreLike function not found.');
        }

        return underscoreLike;
    };

    var exported = null;
    if (amd) {
        define(function () {
            return factory(findUnderscoreLike());
        });
    }
    else if (freeExports && !freeExports.nodeType) {
        exported = factory(findUnderscoreLike());
        // in Node.js or RingoJS v0.8.0+
        if (freeModule) {
            (freeModule.exports = exported).aop = exported;
        }
        // in Narwhal or RingoJS v0.7.0-
        else {
            freeExports.aop = exported;
        }
    }
    else {
        var _ = findUnderscoreLike();
        _.aop = factory(_);
    }


})(function (_) {
    'use strict';

    // 4 char generator.
    // See: http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    function createS4 () {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    /**
     * @returns {string} A guid.
     */
    function createGuid () {
        return createS4() + createS4() + '-' + createS4() + '-' + createS4() + '-' +
            createS4() + '-' + createS4() + createS4() + createS4();
    }

    var nextId = 0;

    function advise (dispatcher, type, advice, receiveArguments) {
        var previous = dispatcher[type];
        var around = type == 'around';
        var signal;
        if (around) {
            var advised = advice(function () {
                return previous.advice(this, arguments);
            });
            signal = {
                remove: function () {
                    signal.cancelled = true;
                },
                advice: function (target, args) {
                    return signal.cancelled ?
                        previous.advice(target, args) : // cancelled, skip to next one
                        advised.apply(target, args);    // called the advised function
                }
            };
        } else {
            // create the remove handler
            signal = {
                remove: function () {
                    var previous = signal.previous;
                    var next = signal.next;
                    if (!next && !previous) {
                        delete dispatcher[type];
                    } else {
                        if (previous) {
                            previous.next = next;
                        } else {
                            dispatcher[type] = next;
                        }
                        if (next) {
                            next.previous = previous;
                        }
                    }
                },
                id: nextId++,
                advice: advice,
                receiveArguments: receiveArguments
            };
        }
        if (previous && !around) {
            if (type === 'after') {
                // add the listener to the end of the list
                // note that we had to change this loop a little bit to workaround a bizarre IE10
                // JIT bug

                while (previous.next && (previous = previous.next)) {}
                previous.next = signal;
                signal.previous = previous;
            } else if (type === 'before') {
                // add to beginning
                dispatcher[type] = signal;
                signal.next = previous;
                previous.previous = signal;
            }
        } else {
            // around or first one just replaces
            dispatcher[type] = signal;
        }
        return signal;
    }

    function aspect(type) {
        return function (target, methodName, advice, receiveArguments) {
            var existing = target[methodName], dispatcher;
            if (!existing || existing.target !== target) {
                // no dispatcher in place
                target[methodName] = dispatcher = function () {
                    // before advice
                    var args = arguments;
                    var before = dispatcher.before;
                    while (before) {
                        args = before.advice.apply(this, args) || args;
                        before = before.next;
                    }
                    var results;
                    // around advice
                    if (dispatcher.around) {
                        results = dispatcher.around.advice(this, args);
                    }
                    // after advice
                    var after = dispatcher.after;
                    var newResults;
                    while (after && after.id < nextId) {
                        if (after.receiveArguments) {
                            newResults = after.advice.apply(this, args);
                            // change the return value only if a new value was returned
                            results = newResults === void 0 ? results : newResults;
                        } else {
                            results = after.advice.call(this, results, args);
                        }
                        after = after.next;
                    }
                    return results;
                };
                if (existing) {
                    dispatcher.around = {advice: function (target, args) {
                        return existing.apply(target, args);
                    }};
                }
                // Tag the disatcher as a reference.
                dispatcher._uaopGuid = existing._uaopGuid;
                dispatcher.target = target;
            }
            var results = advise((dispatcher || existing), type, advice, receiveArguments);
            advice = null;
            return results;
        };
    }

    var cache = {};
    function findDeep (object, test) {
        var key = '', value;
        for (key in object) {
            //noinspection JSUnfilteredForInLoop
            value = object[key];
            //noinspection JSUnfilteredForInLoop
            if (!!test(value, key, object)) {
                return value;
            }
        }
        return null;
    }
    function getDispatcher (originalFunc, context) {
        //noinspection UnnecessaryLocalVariableJS
        var dispatcher = cache[originalFunc._uaopGuid] = findDeep(context, function (value) {
            return !!value && value._uaopGuid === originalFunc._uaopGuid;
        });

        return dispatcher;
    }

    aspect('before')(_, 'bind', function (func) {
        var args = _.toArray(arguments);
        var uuid = func._uaopGuid;
        if (!uuid) {
            uuid = func._uaopGuid = createGuid();
            cache[uuid] = func;
        }

        var advisor = args[0] = function advisor () {
            return (getDispatcher(func, this) || func).apply(this, arguments);
        };

        // Keep a reference to the original function, so we can find it later.
        advisor._uaopGuid = uuid;
        return args;
    });

    // Leave the API open to either apsect(type, )
    return _.extend(function (type) {
        return aspect(type).apply(this, arguments);
    }, {

        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Array|Arguments|undefined>} advice
         * @return {Object.<{remove: Function, advice: Function}>}
         */
        before: aspect('before'),

        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Array|Arguments|undefined>} advice
         * @return {Object.<{remove: Function, advice: Function}>}
         */
        around: aspect('around'),

        /**
         * @param {Object} target
         * @param {string} methodName
         * @param {Function.<Function>} advice
         * @return {Object.<{remove: Function, advice: Function}>}
         */
        after: aspect('after')
    });
});
