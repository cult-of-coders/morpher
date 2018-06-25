# Morpher

Morpher is the client-side version of the `Morph` server-side exposure from `cultofcoders:apollo`.
The reason we have it on NPM is that it can be used with any frontend layer/bundler/framework & React Native.

## Install

```js
// Then on the client
import db, { setClient } from 'morpher';

// Set your Apollo client
setClient(apolloClient);

// Built-in mutations
db.users.insert(document).then(({ _id }) => {});
db.users.update(selector, modifier).then(response => {});
db.users.remove(selector).then(response => {});

// Or define the in object style:
const fields = {
  firstName: 1,
  lastName: 1,
  lastInvoices: {
    total: 1,
  },
};

// Or you could also define the fields in GraphQL style `firstName`

db.users
  .find(fields, {
    filters: {},
    options: {},
  })
  .then(result => {});

// find equivallent .findOne()
```
