Underscore-AOP
==============
An aop library that's compatible w/ underscore.js and lodash.js

Overview
========
A lot of people use Aspect Oriented Programming in JS. It's often called monkey-patching and can be
summed up w/ something I see frequently in other peoples code:

    var originalMethod = obj[methodName];
    obj[methodName] = function advisor () {
        // Do some stuff.
        return originalMethod.apply(this, arguments);
    };

The key here is that the replaced reference modifies the behavior for all users of `obj`. However,
if one of those users happens to do `_.bind(obj[methodName], obj)` before that aspect, then calling
their bound function will not lead to `advisor` being called. This is because the bound function
holds a pointer to the *original* function.

To get around this, I'm aspecting _.bind, so that the newly created function will expose a
*private* (as in it's mine, leave it alone) pointer to the original function. Later, when the bound
function is called, I'll look it up dynamically and figure out if there's an advisor that should be
called instead (might convert this to a uuid based system).


Stability
=========
This is a work in progress... YMMV

Objectives
==========
 - Provide before, after, around support that doesn't fork when `_.bind` has been called.
 - Work in any environment.
 - Provide reasonable performance.
