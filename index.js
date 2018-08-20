import merge from 'deepmerge';
import * as shvl from 'shvl';
import localforage from 'localforage'
export default function(options, storage, key) {
  options = options || {};
  storage = options.storage || localforage;
  key = options.key || 'vuex';

  async function canWriteStorage(storage) {
    try {
      await storage.setItem('@@', 1);
      await storage.removeItem('@@');
      return true;
    } catch (err) {
      throw err
    }
  }

  async function getState(key, storage, value) {
    try {
      return (value =await storage.getItem(key)) && typeof value !== 'undefined'
        ? JSON.parse(value)
        : undefined;
    } catch (err) {
      throw err
    }
  }

  function filter() {
    return true;
  }

  async function setState(key, state, storage) {
    return await storage.setItem(key, JSON.stringify(state));
  }

  function reducer(state, paths) {
    return paths.length === 0
      ? state
      : paths.reduce(function(substate, path) {
          return shvl.set(substate, path, shvl.get(state, path));
        }, {});
  }

  function subscriber(store) {
    return function(handler) {
      return store.subscribe(handler);
    };
  }

  if (!canWriteStorage(storage)) {
    throw new Error('Invalid storage instance given');
  }

  return function(store) {
    const savedState = shvl.get(options, 'getState', getState)(key, storage);

    if (typeof savedState === 'object' && savedState !== null) {
      store.replaceState(merge(store.state, savedState, {
        arrayMerge: options.arrayMerger || function (store, saved) { return saved },
        clone: false,
      }));
    }

    (options.subscriber || subscriber)(store)(function(mutation, state) {
      if ((options.filter || filter)(mutation)) {
        (options.setState || setState)(
          key,
          (options.reducer || reducer)(state, options.paths || []),
          storage
        );
      }
    });
  };
};
