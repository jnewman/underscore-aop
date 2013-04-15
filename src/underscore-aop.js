define(['lodash'], function (_) {
    'use strict';
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
                dispatcher._unboundPointer = existing;
                dispatcher.target = target;
            }
            var results = advise((dispatcher || existing), type, advice, receiveArguments);
            advice = null;
            return results;
        };
    }

    aspect('before')(_, 'bind', function (func) {
        var args = _.toArray(arguments);
        // Keep a reference to the original function, so we can call it.
        func._unboundPointer = func._unboundPointer || func;

        args[0] = function () {
            var dispatcher = _.find(this, function (value, key) {
                return value._unboundPointer && value._unboundPointer === func;
            });
            return (dispatcher || func).apply(this, arguments);
        };
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
