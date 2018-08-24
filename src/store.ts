import Morph from './morph';

class MorphStore {
  static store: { [key: string]: any } = {};

  static retrieve(name) {
    if (!MorphStore.store[name]) {
      MorphStore.store[name] = new Morph(name);
    }

    return MorphStore.store[name];
  }
}

const db = new Proxy(
  {},
  {
    get: function(obj, prop) {
      return MorphStore.retrieve(prop);
    },
  }
);

export const store = {
  client: null,
};

export const setClient = client => (store.client = client);

export default db;
