/*jshint evil:true,maxstatements:10000*/
/*globals module:true,run:true*/

module = (typeof module === 'object' ? module : {});
module.exports = typeof exports === 'object' ? exports : {};
run = module.exports = function (contextDescription, expect, underscore, lodash, aop) {
    'use strict';
    describe(contextDescription, function () {
        var ASPECT_ITERATIONS = 100;
        // NOTE: chromium tends to overflow at ~10000, so exceed, but not so much that the test
        // takes forever..
        var LARGER_THAN_STACK = 12000;

        describe('underscore-aop', function () {
            var subject = null;
            var descendant = null;
            var lodashWrap = null;
            var underscoreWrap = null;
            before(function () {
                aop.unwrapLib();
                lodashWrap = aop.wrapLib(lodash);
                underscoreWrap = aop.wrapLib(underscore);
            });

            beforeEach(function () {
                function Subject (props) {
                    lodash.extend(this, props);
                    this._cid = Subject.prototype._cidCounter++;
                }

                lodash.extend(Subject.prototype, {
                    idAttr: 'id',
                    _cidCounter: 0,
                    getId: function () {
                        var realId = this[this.idAttr];
                        return !lodash.isUndefined(realId) ? realId : this._cid;
                    },
                    setId: function (id) {
                        this[this.idAttr] = id;
                        return this;
                    },
                    /**
                     *
                     * @param {number...} number
                     * @returns {number}
                     */
                    sum: function (number) {
                        //noinspection JSValidateTypes
                        return lodash.reduce(arguments, function (total, current) {
                            return total + Number(current);
                        }, 0);
                    },

                    other: function () {}
                });

                subject = new Subject();

                function Descendant () {}
                Descendant.prototype = new Subject();
                descendant = new Descendant();
            });

            afterEach(function () {
                subject = null;
                descendant = null;
            });

            after(function () {
                aop._dispatchers = null;
                lodashWrap.remove();
                underscoreWrap.remove();
            });

            it('can wrap a method', function () {
                subject.setId(99);
                expect(subject.getId()).to.equal(99);

                var handle = aop.around(subject, 'getId', function (orig) {
                    return function () {
                        return 42 + orig.call(this);
                    };
                });

                expect(subject.getId()).to.equal(141);
                handle.remove();
                expect(subject.getId()).to.equal(99);
            });

            it('can inject functionality before a method is executed', function () {
                expect(subject.sum(1, 1)).to.equal(2);
                var handle = aop.before(subject, 'sum', function (number) {
                    var args = lodash.toArray(arguments);
                    args[0]++;
                    return args;
                });

                expect(subject.sum(1, 1)).to.equal(3);
                handle.remove();
                expect(subject.sum(1, 1)).to.equal(2);
            });

            it('can inject functionality after a method is executed', function () {
                expect(subject.sum(1, 1)).to.equal(2);
                var handle = aop.after(subject, 'sum', function (total) {
                    return total + 1;
                });

                expect(subject.sum(1, 1)).to.equal(3);
                handle.remove();
                expect(subject.sum(1, 1)).to.equal(2);
            });

            // Around is exempt from this.
            // TODO: See if I can get this test to run in a reasonable amount of time.
            it('does not crash when aspecting the same method many times', function () {
                expect(subject.sum(1, 1)).to.equal(2);
                var afterSum = function (total) {
                    return total + 1;
                };

                var handles = [];
                var i = 0;

                while (i++ < LARGER_THAN_STACK) {
                    //noinspection JSHint
                    handles.push(aop.after(subject, 'sum', afterSum));
                }

                expect(subject.sum(1, 1)).to.equal(2 + LARGER_THAN_STACK);
                lodash.invoke(handles, 'remove');
                expect(subject.sum(1, 1)).to.equal(2);
            });

            it('aspects a bound method', function () {
                var byLib = function (lib) {
                    var getId = lib.bind(subject.getId, subject);
                    expect(subject.getId()).to.equal(0);

                    var handle = aop.after(subject, 'getId', function (id) {
                        return id + 1;
                    });

                    expect(getId()).to.equal(1);
                    handle.remove();
                    expect(getId()).to.equal(0);
                };
                lodash.forEach([underscore, lodash], byLib);
            });

            it('reliably looks up a method in the cache', function () {
                var byLib = function (lib) {
                    var ogid = subject.getId;
                    var getId = lib.bind(subject.getId, subject);

                    var assertAspectIncrements = function (shouldBe) {
                        aop.after(subject, 'getId', function (id) {
                            return id + 1;
                        });
                        expect(getId()).to.equal(shouldBe);
                    };

                    var i = 0;
                    while (i < ASPECT_ITERATIONS) {
                        // Initial should be 1, since 0 + 1.
                        assertAspectIncrements(++i);
                    }
                    subject.getId = ogid;
                };
                lodash.forEach([underscore, lodash], byLib);
            });

            it('finds methods in the cache even if they\'re bound many times', function () {
                var byLib = function (lib) {
                    var ogid = subject.getId;
                    // Initial bind, just cause.
                    var getId = lib.bind(subject.getId, subject);

                    var assertBindThenAspectIncrements = function (shouldBe) {
                        getId = lib.bind(subject.getId, subject);
                        aop.after(subject, 'getId', function (id) {
                            return id + 1;
                        });
                        expect(getId()).to.equal(shouldBe);
                    };

                    var i = 0;
                    while (i < ASPECT_ITERATIONS) {
                        assertBindThenAspectIncrements(++i);
                    }
                    subject.getId = ogid;
                };
                lodash.forEach([underscore, lodash], byLib);
            });

            it('doesn\'t care if the method is inherited', function () {
                var byLib = function (lib) {
                    var ogid = descendant.getId;
                    var getId = lib.bind(descendant.getId, descendant);
                    var assertBindThenAspectIncrements = function (shouldBe) {
                        getId = lib.bind(descendant.getId, descendant);
                        aop.after(descendant, 'getId', function (id) {
                            return id + 1;
                        });

                        expect(getId()).to.equal(shouldBe);
                    };

                    // IDs start one higher for the descendant.
                    var i = 1;
                    while (i < (ASPECT_ITERATIONS + 1)) {
                        assertBindThenAspectIncrements(++i);
                    }
                    descendant.getId = ogid;
                };
                lodash.forEach([underscore, lodash], byLib);
            });

            it('cleans up after itself', function () {
                var i = 0,
                    originalSize = lodash.size(aop._dispatchers),
                    aopMethod = '',
                    genMethod = '',
                    handle = null,
                    noopA = function () {},
                    noopB = function () {};

                while (i++ < ASPECT_ITERATIONS) {
                    descendant[(genMethod = 'other' + String(i))] = noopB;
                    aopMethod = i % 3 === 0 ? 'after' : i % 2 === 0 ? 'before' : 'around';
                    handle = aop[aopMethod](descendant, genMethod, noopA);
                    handle.remove();
                    delete noopB._uaopId;
                }

                expect(lodash.size(aop._dispatchers)).to.equal(originalSize);
            });

            it('handles methods that\'ve used bindAll', function () {
                lodash.forEach([lodash, underscore], function (_) {
                    _.bindAll(subject, ['getId']);

                    var handle = aop.around(subject, 'getId', function (orig) {
                        return function () {
                            return 42 + orig.call(this);
                        };
                    });

                    expect(subject.getId()).to.equal(42);
                    handle.remove();
                    expect(subject.getId()).to.equal(0);
                });
            });
        });
    });
};
