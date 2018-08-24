import { store } from './store';
import * as EJSON from 'ejson';
import objectToQuery from './objectToQuery';
import gql from 'graphql-tag';

export type QueryCacheItem = {
  str: string;
  gql: object;
};

export default class Morph {
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
      mutation ${this.name + 'Update'}($payload: String!) {
        ${this.name + 'Update'}(payload: $payload) 
      }
    `;

    this.insertMutation = gql`
      mutation ${this.name + 'Insert'}($payload: String!) {
        ${this.name + 'Insert'}(payload: $payload) {
          _id
        }
      }
    `;

    this.removeMutation = gql`
      mutation ${this.name + 'Remove'}($payload: String!) {
        ${this.name + 'Remove'}(payload: $payload)
      }
    `;
  }

  update(selector, modifier, options = {}): Promise<any> {
    // TODO: optimistic responses built-in?

    if (typeof selector === 'string') {
      selector = { _id: selector };
    }

    return new Promise((resolve, reject) => {
      return store.client
        .mutate({
          mutation: this.updateMutation,
          variables: {
            payload: EJSON.stringify({ selector, modifier }),
          },
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
      store.client
        .mutate({
          mutation: this.insertMutation,
          variables: {
            payload: EJSON.stringify({ document }),
          },
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
      return store.client
        .mutate({
          mutation: this.removeMutation,
          variables: {
            payload: EJSON.stringify({ selector }),
          },
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
      return store.client
        .query({
          query,
          variables: {
            payload: EJSON.stringify(params),
          },
          ...options,
        })
        .then(({ data }) => {
          resolve(data[`${this.name}`]);
        })
        .catch(reject);
    });
  }

  count(params = {}, options = {}): Promise<any> {
    let query = this._getCachedQuery(`
      query ${this.name}Count($payload: String!) {
        ${this.name}Count(payload: $payload)
      }
    `);

    return new Promise((resolve, reject) => {
      return store.client
        .query({
          query,
          variables: {
            payload: EJSON.stringify(params),
          },
          ...options,
        })
        .then(({ data }) => {
          resolve(data[`${this.name}Count`]);
        })
        .catch(reject);
    });
  }

  findOne(query, params = {}, options = {}): Promise<any> {
    if (typeof query === 'object') {
      query = objectToQuery(query);
    }

    query = this._getQueryFromString(query, 'Single');

    return new Promise((resolve, reject) => {
      return store.client
        .query({
          query,
          variables: {
            payload: EJSON.stringify(params),
          },
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
      query ${this.name}${suffix}($payload: String!) {
        ${this.name}${suffix}(payload: $payload) {
          ${str}
        } 
      }
    `);
  }

  _getSubscriptionFromString(str, suffix = '') {
    return this._getCachedQuery(`
      subscription ${this.name}${suffix}($payload: String!) {
        ${this.name}(payload: $payload) {
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
