'use strict'

const assert = require('assert')

const _ = require('lodash')

module.exports = ({
  db, table, object, key, updateIgnore = []
}) => {
  const keys = _.isString(key) ? [key] : key
  const objects = Array.isArray(object) ? object : [object]
  objects.forEach(obj =>
    keys.forEach(field =>
      assert(_.has(obj, field), `Key "${field}" is missing.`)
    )
  )

  const prototypeObject = objects[0]
  const updateFields = _.chain(prototypeObject)
    .omit(keys)
    .keys()
    .difference(updateIgnore)
    .value()
  const insert = db.table(table).insert(objects)
  const keyPlaceholders = new Array(keys.length).fill('??').join(',')

  if (updateFields.length === 0) {
    return db
      .raw(`? ON CONFLICT (${keyPlaceholders}) DO NOTHING RETURNING *`, [insert, ...keys])
      .then(result => _.get(result, ['rows', 0]))
  }

  const update = Array.isArray(object)
    ? db.queryBuilder().update(
      _.chain(prototypeObject)
        .pick(updateFields)
        .mapValues((v, k) => db.raw('excluded.?', k))
        .value()
    )
    : db.queryBuilder().update(_.pick(object, updateFields))
  return db
    .raw(`? ON CONFLICT (${keyPlaceholders}) DO ? RETURNING *`, [insert, ...keys, update])
    .then(result => _.get(result, ['rows', 0]))
}
