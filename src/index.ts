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

  const updateFields = _.difference(
    Object.keys(_.omit(object, keys)),
    updateIgnore,
  )
  const insert = db.table(table).insert(object)
  const keyPlaceholders = new Array(keys.length).fill('??').join(',')
  const dialect = db.client.config.client

  if (updateFields.length === 0) {
    const query =
      dialect === 'mysql'
        ? `? ON DUPLICATE KEY (${keyPlaceholders}) DO NOTHING `
        : `? ON CONFLICT (${keyPlaceholders}) DO NOTHING RETURNING *`
    const result = await db.raw(query, [insert, ...keys])
    return _.get(result, ['rows', 0])
  }

  const update = db.queryBuilder().update(_.pick(object, updateFields))
  if (dialect === 'mysql') {
    const updateStr = update.toString().replace('set', '')
    return db.raw(insert + ' ON DUPLICATE KEY ' + updateStr)
  }
  const result = await db.raw(
    `? ON CONFLICT (${keyPlaceholders}) DO ? RETURNING *`,
    [insert, ...keys, update],
  )
  return _.get(result, ['rows', 0])
}

export { upsert }

export default upsert
