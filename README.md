# knex-upsert

An upsert function for knex.

## Installation

```
npm install knex-upsert --save
```

## Usage

<!-- eslint-disable strict,node/no-missing-require -->

```js
const knex = require('knex')
const upsert = require('knex-upsert')

const db = knex({
  dialect: 'sqlite3', //or mysql
  connection: { filename: './data.db' }
})
db.schema.createTable('users', table => {
  table.increments('id')
  table.string('user_name')
})

upsert({
  db,
  table: 'users',
  object: { id: 1, user_name: 'happy-user' },
  key: 'id',
}).then(res=>{
//callback
}).catch(err=>{
//error handling
})
```
