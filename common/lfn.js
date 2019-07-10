/**
A light native alternative to underscore, as the fitbit compiler was not able to handle the callstack size :(
Many of the solutions are pulled from https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_flatten
Alternatively I may pull directly from lodash or underscore
*/
const makeSelect = (comparator) => (a, b) => comparator(a, b) ? a : b
const pluck = (list, name) => list.map(x => x[name])

const first = (list, valueOrPredicate) => {
  let i = 0

  if (typeof valueOrPredicate !== 'function') {
      let val = valueOrPredicate
      valueOrPredicate = (newVal) => newVal === val
  }
  while (i < list.length && !valueOrPredicate(list[i])) i++
  return i < list.length ? list[i] : undefined
}

const all = (list, valueOrPredicate) => {
  let i = 0
  if (typeof valueOrPredicate !== 'function') {
      let val = valueOrPredicate
      valueOrPredicate = (newVal) => newVal === val
  }
  while (i < list.length && valueOrPredicate(list[i])) i++
  return i == list.length
}

//from underscore.js
// Returns whether an object has a given set of `key:value` pairs.
const isMatch = function(object, attrs) {
  let keys = Object.keys(attrs), length = keys.length;
  if (object == null) return !length;
  let obj = Object(object);
  for (let i = 0; i < length; i++) {
    let key = keys[i];
    if (attrs[key] !== obj[key] || !(key in obj)) return false;
  }
  return true;
}

//from underscore.js
// accepts an array to retrieve the properties in an object recursively
const deepGet = function(obj, path) {
  const length = path.length;
  for (let i = 0; i < length; i++) {
    if (obj == null) return void 0;
    obj = obj[path[i]];
  }
  return length ? obj : void 0;
}

//from underscore.js
// A helper function to wrap callbacks appropriately, and safeguard against empty callbacks etc
const cb = function(value, context, argCount) {
    if (value == null || value == undefined) return (v) => v;
    if (typeof value === 'function') return value.bind(context)
    if (typeof value === 'object' && !Array.isArray(value)) return v => isMatch(v, value);
    //at this point we're only left with a string or a number, so we'll retrieve either an index or a property
    return Array.isArray(value) ? v => deepGet(v, value) : v => v[value];
}

export const _ = {
    uniq(list) { return [...new Set(list)] },
    pairs(object) { return Object.entries(object) },
    first: first,
    keys: Object.keys,
    sum(list) { return list.reduce(function(memo, num){ return memo + num; }, 0) },
    flatten(list) { return list.reduce( (a, b) => a.concat(b), []) },
    minBy(collection, key) {
      // slower because need to create a lambda function for each call...
      const select = (a, b) => a[key] <= b[key] ? a : b
      return collection.reduce(select, {})
    },
    maxBy(collection, key) {
      // slower because need to create a lambda function for each call...
      const select = (a, b) => a[key] >= b[key] ? a : b
      return collection.reduce(select, {})
    },
    min(collection, iteratee) { 
      let comparitor = makeSelect((a, b) => a <= (iteratee !== undefined ? iteratee(b) : b))
      let initial = collection.length > 0 ? collection[0] : undefined
      if (iteratee !== undefined) initial = iteratee(initial)
      return collection.reduce(comparitor, initial)
    },
    max(collection, iteratee) {
      let comparitor = makeSelect((a, b) => a >= (iteratee !== undefined ? iteratee(b) : b))
      let initial = collection.length > 0 ? collection[0] : undefined
      if (iteratee !== undefined) initial = iteratee(initial)
      return collection.reduce(comparitor, initial)
    },
    pluck: pluck,
    sortby(obj, iteratee, context) {
      //sourced and modified directly from underscore
      var index = 0;
      iteratee = cb(iteratee, context);
      return pluck(obj.map(function(value, key, list) {
        return {
          value: value,
          index: index++,
          criteria: iteratee(value, key, list)
        };
      }).sort(function(left, right) {
        var a = left.criteria;
        var b = right.criteria;
        if (a !== b) {
          if (a > b || a === void 0) return 1;
          if (a < b || b === void 0) return -1;
        }
        return left.index - right.index;
      }), 'value');
    },
    any(list, valueOrPredicate) {
      return first(list, valueOrPredicate) !== undefined
    },
    all: all
  }

const test = () => {
  let fails = []
  
  if (_.min([1,2,3,4]) != 1) fails.push('min')
  if (_.max([1,2,3,4]) != 4) fails.push('max')
  let tosort = [{value:2}, {value:1}, {value:3}, {value:4}, {value:-1}]
  if (_.sortby(tosort, 'value')[0].value != -1) fails.push('sortby:string prop')
  if (_.sortby(tosort, v => v.value)[0].value != -1) fails.push('sortby:function')
  if (!_.any([1,2,3,4,5,6,'bloop'], v => v == 'bloop')) fails.push('any:predicate')
  if (!_.any([1,2,3,4,5,6,'bloop'], 'bloop')) fails.push('any:value')
  if (_.pluck([{a: 'youch', b: 'b'}, {a: 'stop that', b: 'b'}, {a: 'quit it', b: 'b'}], 'a').join(' ') != 'youch stop that quit it') fails.push('pluck')
  if (!isMatch(_.minBy(tosort, 'value'), {value:-1})) fails.push('minBy')
  if (!isMatch(_.maxBy(tosort, 'value'), {value:4})) fails.push('maxBy')
  if (!isMatch(_.keys({a:'a', b:'b', c:'c'}), ['a', 'b', 'c'])) fails.push('keys')
  if (!isMatch(_.flatten(_.pairs({a:'a', b:'b', c:'c'})), ['a', 'a', 'b', 'b', 'c', 'c'])) fails.push('pairs')
  if (!isMatch(_.uniq([1,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5]), [1,2,3,4,5])) fails.push('uniq')
  if (_.sum([1,2,3,4]) != 10) fails.push('sum')
  if (!isMatch(_.flatten([1,[2,3,4],5]), [1,2,3,4,5])) fails.push('flatten')
  if (!_.all([1,2,3,4,5,6], v => v > 0)) fails.push('all:predicate')
  if (!_.all([0,0,0,0,0,0,0,0], 0)) fails.push('all:value')
  if (_.all([1,0,0,0,0,0,0],0)) fails.push('all:value:negative')
  if (_.all([0,1,2,3,4,5,6], v => v > 0)) fails.push('all:predicate:negative')
  
  return fails
}
