'use strict'

const assert = require('assert')

const _ = require('lodash')

module.exports = ({ db, table, object, key, updateIgnore = [] }) => {
  const keys = _.isString(key) ? [key] : key
  keys.forEach((field) =>
    assert(_.has(object, field), `Key "${field}" is missing.`),
  )

  const updateFields = _.difference(_.keys(_.omit(object, keys)), updateIgnore)
  const insert = db.table(table).insert(object)
  const keyPlaceholders = new Array(keys.length).fill('??').join(',')
  const dialect = db.client.config.client

  if (updateFields.length === 0) {
    if (dialect === 'mysql') {
      return db
        .raw(`? ON duplicate key (${keyPlaceholders}) DO NOTHING `, [
          insert,
          ...keys,
        ])
        .then((result) => _.get(result, ['rows', 0]))
    }
    return db
      .raw(`? ON CONFLICT (${keyPlaceholders}) DO NOTHING RETURNING *`, [
        insert,
        ...keys,
      ])
      .then((result) => _.get(result, ['rows', 0]))
  }

  let update = db.queryBuilder().update(_.pick(object, updateFields))
  if (dialect === 'mysql') {
    update = update.toString().replace('set', '')
    return db.raw(`${insert} ON duplicate key ${update}`)
  }
  return db
    .raw(`? ON CONFLICT (${keyPlaceholders}) DO ? RETURNING *`, [
      insert,
      ...keys,
      update,
    ])
    .then((result) => _.get(result, ['rows', 0]))
}
