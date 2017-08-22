import knex from 'knex'
import mockDb, { getTracker } from 'mock-knex'

import test from 'ava'

import upsert from '..'

test.beforeEach(t => {
  const db = knex({
    client: 'sqlite',
    useNullAsDefault: true,
  })
  mockDb.mock(db)
  t.context.db = db

  const tracker = getTracker()
  tracker.install()
  t.context.tracker = tracker
})

test.afterEach.always(t => {
  const { db, tracker } = t.context
  tracker.uninstall()
  mockDb.unmock(db)
})

test.serial(async t => {
  const { db, tracker } = t.context
  tracker.on('query', (query, step) => {
    t.is(step, 1)
    if (query.method === 'raw') {
      t.is(
        query.sql,
        'insert into  ("field", "id") values (?, ?) ON CONFLICT (id) DO update  set "field" = ? RETURNING *'
      )
      query.response({ rows: ['updated-object'] })
    } else {
      t.fail(query)
    }
  })

  const object = { id: '1', field: 'value' }
  const result = await upsert({ db, object, key: 'id' })
  t.is(result, 'updated-object')
})

test.serial('updateIgnore', async t => {
  const { db, tracker } = t.context
  tracker.on('query', (query, step) => {
    t.is(step, 1)
    if (query.method === 'raw') {
      t.is(
        query.sql,
        'insert into  ("field", "id", "ignore") values (?, ?, ?) ON CONFLICT (id) DO update  set "field" = ? RETURNING *'
      )
      query.response({ rows: ['updated-object'] })
    } else {
      t.fail(query)
    }
  })

  const object = { id: '1', field: 'value', ignore: 'value' }
  const result = await upsert({
    db,
    object,
    key: 'id',
    updateIgnore: ['ignore'],
  })
  t.is(result, 'updated-object')
})
