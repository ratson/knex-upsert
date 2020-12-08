import assert from 'assert'
import type Knex from 'knex'
import _ from 'lodash'

export interface Options {
  db: Knex
  table: string
  object: any
  key: string
  updateIgnore?: string[]
}

const upsert = async ({
  db,
  table,
  object,
  key,
  updateIgnore = [],
}: Options): Promise<any> => {
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
    const updateStr = update.toString().replace('set', '')
    return db.raw(insert + ' ON duplicate key ' + updateStr)
  }
  return db
    .raw(`? ON CONFLICT (${keyPlaceholders}) DO ? RETURNING *`, [
      insert,
      ...keys,
      update,
    ])
    .then((result) => _.get(result, ['rows', 0]))
}

export { upsert }

export default upsert
