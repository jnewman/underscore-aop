Underscore-AOP
==============
An aop library that's compatible w/ underscore.js and lodash.js

Overview
========
A lot of people use Aspect Oriented Programming (AOP) in JS. It's often called monkey-patching and
can be exemplified w/ a common "pattern" I see rather frequently:

    var originalMethod = obj[methodName];
    obj[methodName] = function advisor () {
        // Do some stuff.
        return originalMethod.apply(this, arguments);
    };

The key here is that the replaced reference modifies the behavior for all users of `obj`. However,
if one of those users happens to do `_.bind(obj[methodName], obj)` before that aspect, then calling
their bound function will not lead to `advisor` being called. This is because the bound function
holds a pointer to the **original** function.

To get around this, I'm aspecting `_.bind`, so that the newly created function will expose a
**private** (as in it's mine, leave it alone) guid. Later, when the bound function is called, I
look at all the methods on the context and figure out if there's an advisor that should be called
instead.


Stability
=========
Check out the test for yourself. Seems ok to me, but I'm happy to test any corner cases etc.

Objectives
==========
I'm hoping to achieve/accomplish:

 - Provide before, after, around support that doesn't fork when `_.bind` has been called.
 - Work in any environment.
 - Provide reasonable performance.

Helping Out
===========
If you want to help out, feel free to file pull requests.

To run the tests, ensure you have a recent version of [NodeJs|http://nodejs.org/download/] (>=0.8).
Then, do:
    git clone --recursive /path/to/your/fork # recursive matters here, since I'm using submodules.
    cd underscore-aop
    npm install # npm comes w/ recent versions of node.
    npm test # You should see some green lights.

Please, ensure all current tests run and any new features have reasonable tests. (Checkout
[coverjs-gold|https://github.com/keeyip/CoverJS] if you're interested in this sorta thing.)
