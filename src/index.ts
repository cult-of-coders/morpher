import gql from 'graphql-tag';
import objectToQuery from './objectToQuery';

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

export default db;

let client;
export const setClient = _client => (client = _client);

type QueryCacheItem = {
  str: string;
  gql: object;
};

class Morph {
  name: string;
  updateMutation: any;
  insertMutation: any;
  removeMutation: any;
  queryCache: QueryCacheItem[] = [];

  constructor(name) {
    this.name = name;

    this.craftGQL();
  }

  craftGQL() {
    this.updateMutation = gql`
      mutation ${this.name + 'Update'}($selector: JSON, $modifier: JSON) {
        ${this.name + 'Update'}(selector: $selector, modifier: $modifier) 
      }
    `;

    this.insertMutation = gql`
      mutation ${this.name + 'Insert'}($document: JSON) {
        ${this.name + 'Insert'}(document: $document) {
          _id
        }
      }
    `;

    this.removeMutation = gql`
      mutation ${this.name + 'Remove'}($selector: JSON) {
        ${this.name + 'Remove'}(selector: $selector)
      }
    `;
  }

  update(selector, modifier, options = {}): Promise<any> {
    // TODO: optimistic responses built-in?

    if (typeof selector === 'string') {
      selector = { _id: selector };
    }

    return new Promise((resolve, reject) => {
      return client
        .mutate({
          mutation: this.updateMutation,
          variables: { selector, modifier },
          ...options,
        })
        .then(({ data }) => {
          resolve(data[`${this.name}Update`]);
        })
        .catch(reject);
    });
  }

  insert(document, options = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      client
        .mutate({
          mutation: this.insertMutation,
          variables: { document },
          ...options,
        })
        .then(({ data }) => {
          resolve(data[`${this.name}Insert`]);
        })
        .catch(reject);
    });
  }

  remove(selector, options): Promise<any> {
    if (typeof selector === 'string') {
      selector = { _id: selector };
    }

    return new Promise((resolve, reject) => {
      return client
        .mutate({
          mutation: this.removeMutation,
          variables: { selector },
          ...options,
        })
        .then(({ data }) => {
          resolve(data[`${this.name}Remove`]);
        })
        .catch(reject);
    });
  }

  find(query, params = {}, options = {}): Promise<any> {
    if (typeof query === 'object') {
      query = objectToQuery(query);
    }

    query = this._getQueryFromString(query);

    return new Promise((resolve, reject) => {
      return client
        .query({
          query,
          variables: { params },
          ...options,
        })
        .then(({ data }) => {
          resolve(data[`${this.name}`]);
        })
        .catch(reject);
    });
  }

  findOne(query, params, options = {}): Promise<any> {
    if (typeof query === 'object') {
      query = objectToQuery(query);
    }

    query = this._getQueryFromString(query, 'Single');

    return new Promise((resolve, reject) => {
      return client
        .query({
          query,
          variables: { params },
          ...options,
        })
        .then(({ data }) => {
          resolve(data[`${this.name}Single`]);
        })
        .catch(reject);
    });
  }

  createReactiveQuery({ query, params }) {
    if (typeof query !== 'string') {
      query = objectToQuery(query);
    }

    const _query = this._getQueryFromString(query);
    const _subscription = this._getSubscriptionFromString(query);

    return {
      query: _query,
      subscription: _subscription,
    };
  }

  _getQueryFromString(str, suffix = '') {
    return this._getCachedQuery(`
      query ${this.name}${suffix}($params: JSON!) {
        ${this.name}${suffix}(params: $params) {
          ${str}
        } 
      }
    `);
  }

  _getSubscriptionFromString(str, suffix = '') {
    return this._getCachedQuery(`
      subscription ${this.name}${suffix}($params: JSON!) {
        ${this.name}(params: $params) {
          event
          doc
        } 
      }
    `);
  }

  _getCachedQuery(fullStr) {
    const queryItem = this.queryCache.find(item => {
      return item.str === fullStr;
    });

    if (queryItem) {
      return queryItem.gql;
    } else {
      const _gql = gql(fullStr);

      this.queryCache.push({
        str: fullStr,
        gql: _gql,
      });

      return _gql;
    }
  }
}
