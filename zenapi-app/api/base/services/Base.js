'use strict';

/**
 * `Base` service for any common calls.
 */

// Public dependencies.
const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('zenapi-utils');
const hm = require('./helpers/history/history-model');


// BASE FUNCTIONS

/**
 * Promise to fetchAll a/an Model.
 *
 * @return {Promise}
 */
function fetchAll(dataModelName, ctx, populate) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;

  const params = ctx.query;
  let withDeleted = (ctx.query && ctx.query.withDeleted)?(ctx.query.withDeleted === 'true'?true:false):false;
  // Need to remove the QueryItem
  delete ctx.query.withDeleted;

  let filters = convertRestQueryParams(params);
  const populateOpt = populate || dataModel.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias)

  let retData = buildQuery({
    model: dataModel,
    filters,
    populate: populateOpt,
  })

  if(softDelete){
    if(!softDelete.exclude || Object.keys(softDelete.exclude).filter(f => f.toLocaleLowerCase() === dataModelName.toLocaleLowerCase()).length<=0){
      retData = retData.where('deleted').ne(!withDeleted);
    }
  }

  return retData;
};

/**
 * Promise to fetch a/an Model.
 *
 * @return {Promise}
 */
function fetch(dataModelName, ctx) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;

  const params = ctx.params;
  let withDeleted = (ctx.query && ctx.query.withDeleted)?(ctx.query.withDeleted === 'true'?true:false):false;
  // Need to remove the QueryItem
  delete ctx.query.withDeleted;

  // Select field to populate.
  const populate = dataModel.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias)
    .join(' ');

  if(softDelete){
    if(withDeleted){
      return dataModel
      .findOne(_.pick(params, _.keys(dataModel.schema.paths)))
      .populate(populate);
    } else {
      return dataModel
      .findOne(_.pick(params, _.keys(dataModel.schema.paths)))
      .where('deleted').ne(true)
      .populate(populate);
    }
  } else {
    return dataModel
    .findOne(_.pick(params, _.keys(dataModel.schema.paths)))
    .populate(populate);
  }
};

/**
 * Promise to count Model.
 *
 * @return {Promise}
 */
function count(dataModelName, ctx) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;

  const params = ctx.query;
  let withDeleted = (ctx.query && ctx.query.withDeleted)?(ctx.query.withDeleted === 'true'?true:false):false;
  // Need to remove the QueryItem
  delete ctx.query.withDeleted;

  const filters = convertRestQueryParams(params);

  let retData = buildQuery({
    model: dataModel,
    filters: { where: filters.where },
  }).count();

  if(softDelete){
    retData = retData.where('deleted').ne(!withDeleted);
  }

  return retData;
};

/**
 * Promise to add a/an Model.
 *
 * @return {Promise}
 */
async function add(dataModelName, ctx) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;

  let values = ctx.request.body;

  // Extract values related to relational data.
  const relations = _.pick(values, dataModel.associations.map(ast => ast.alias));
  const data = _.omit(values, dataModel.associations.map(ast => ast.alias));

  if(softDelete){
    if(!softDelete.exclude || Object.keys(softDelete.exclude).filter(f => f.toLocaleLowerCase() === dataModelName.toLocaleLowerCase()).length<=0){
      data.deleted = false;
    }
  }

  // Create entry with no-relational data.
  const entry = await dataModel.create(data);

  if(patchHistory && entry.id){
    if(!patchHistory.exclude || Object.keys(patchHistory.exclude).filter(f => f.toLocaleLowerCase() === dataModelName.toLocaleLowerCase()).length<=0){
      let newVersion = await hm.SaveHistory(entry, hm.opperations.insert, dataModelName);
    }
  }

  // Create relational data and return the entry.
  return dataModel.updateRelations({ _id: entry.id, values: relations });
};

/**
 * Promise to edit a/an Model.
 *
 * @return {Promise}
 */
async function edit(dataModelName, ctx) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;

  let params = ctx.params;
  let values = ctx.request.body;

  // Extract values related to relational data.
  const relations = _.pick(values, dataModel.associations.map(a => a.alias));
  const data = _.omit(values, dataModel.associations.map(a => a.alias));

  let version = 0;
  if(patchHistory){
    if(!patchHistory.exclude || Object.keys(patchHistory.exclude).filter(f => f.toLocaleLowerCase() === dataModelName.toLocaleLowerCase()).length<=0){
      const oldData = await dataModel.findOne(_.pick(params, _.keys(dataModel.schema.paths)))
      version = await hm.SaveHistory(oldData, hm.opperations.update, dataModelName);
      data.__v = version; // Update Version No.
    }
  }

  // Update entry with no-relational data.
  const entry = await dataModel.updateOne(params, data, { multi: true });

  // Update relational data and return the entry.
  return dataModel.updateRelations(Object.assign(params, { values: relations }));
};

/**
 * Promise to remove a/an Model.
 *
 * @return {Promise}
 */
async function remove(dataModelName, ctx) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;



  if(softDelete){
    return zenapi.services.base.softDelete(dataModelName, ctx);
  } else {
    return zenapi.services[dataModelName].remove(ctx.params);
  }
};

/**
 * Promise to softDelete a/an Model
 *
 * @return {Promise}
 */
async function softDelete(dataModelName, ctx) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;

  const params = ctx.params;
  let data = {};
  data.deleted = true;
  data.deletedAt = new Date();
  data.deletedBy = (ctx.state && ctx.state.user && ctx.state.user._id)?ctx.state.user._id.toString():undefined;

  const relations = _.pick(data, dataModel.associations.map(a => a.alias));
  const newData = _.omit(data, dataModel.associations.map(a => a.alias));

  if(patchHistory){
    if(!patchHistory.exclude || Object.keys(patchHistory.exclude).filter(f => f.toLocaleLowerCase() === dataModelName.toLocaleLowerCase()).length<=0){
      const oldData = await dataModel.findOne(_.pick(params, _.keys(dataModel.schema.paths)))
      let version = await hm.SaveHistory(oldData, hm.opperations.delete, dataModelName);
      newData.__v = version; // Update Version No.
    }
  }

  // Update entry with no-relational data.
  const entry = await dataModel.findOneAndUpdate(params, {$set: newData}, { multi: true });
  
  return dataModel.updateRelations(Object.assign(params, { values: relations }));

};

/**
 * Promise to restore (if softDelete) a/an Model.
 *
 * @return {Promise}
 */
async function restore(dataModelName, ctx) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;
  // Get Model
  const params = ctx.params;
  let data = {}

  const relations = _.pick(data, dataModel.associations.map(a => a.alias));

  if(patchHistory){
    if(!patchHistory.exclude || Object.keys(patchHistory.exclude).filter(f => f.toLocaleLowerCase() === dataModelName.toLocaleLowerCase()).length<=0){
      const oldData = await dataModel.findOne(_.pick(params, _.keys(dataModel.schema.paths)))
      let version = await hm.SaveHistory(oldData, hm.opperations.restore, dataModelName);
      data.__v = version; // Update Version No.
    }
  }

  // Update entry with no-relational data.
  const entry = await dataModel.findOneAndUpdate(params, {$set: {deleted: false, __v: data.__v}, $unset: {deletedAt:1, deletedBy:1}}, { multi: true });
  
  return dataModel.updateRelations(Object.assign(params, { values: relations }));

};

/**
 * Promise to rollback (if patchHistory) a/an Model.
 *
 * @return {Promise}
 */
async function rollback(dataModelName, ctx) {
  const { patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;

  let params = ctx.params;
  let values = ctx.request.body;
  let version = values.version;

  // Extract values related to relational data.
  const relations = _.pick(values, dataModel.associations.map(a => a.alias));
  let rollbackData = null;

  if(patchHistory){
    if(!patchHistory.exclude || Object.keys(patchHistory.exclude).filter(f => f.toLocaleLowerCase() === dataModelName.toLocaleLowerCase()).length<=0){
      rollbackData = await hm.GetHistory(dataModelName, params, version);
    }
  }

  if(rollbackData && rollbackData.d){
    // Update entry with no-relational data.
    const entry = await dataModel.updateOne(params, {$set:rollbackData.d}, { multi: true });

    // Update relational data and return the entry.
    return dataModel.updateRelations(Object.assign(params, { values: relations }));
  } else {
    return 'No rollback data found';
  }

};

/**
 * Promise to search a/an Model.
 *
 * @return {Promise}
 */
async function search(dataModelName, ctx) {
  const { softDelete, patchHistory } = zenapi.config;
  // Get Model
  const dataModel = zenapi.models[dataModelName];
  if(dataModel === undefined || dataModel === null) return null;

  const params = ctx.params;
  let withDeleted = (ctx.query && ctx.query.withDeleted)?(ctx.query.withDeleted === 'true'?true:false):false;
  // Need to remove the QueryItem
  delete ctx.query.withDeleted;

  // Convert `params` object to filters compatible with Mongo.
  const filters = zenapi.utils.models.convertParams(dataModel, params);
  // Select field to populate.
  const populate = Testcontent.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias)
    .join(' ');

  const $or = Object.keys(Testcontent.attributes).reduce((acc, curr) => {
    switch (Testcontent.attributes[curr].type) {
      case 'integer':
      case 'float':
      case 'decimal':
        if (!_.isNaN(_.toNumber(params._q))) {
          return acc.concat({ [curr]: params._q });
        }

        return acc;
      case 'string':
      case 'text':
      case 'password':
        return acc.concat({ [curr]: { $regex: params._q, $options: 'i' } });
      case 'boolean':
        if (params._q === 'true' || params._q === 'false') {
          return acc.concat({ [curr]: params._q === 'true' });
        }

        return acc;
      default:
        return acc;
    }
  }, []);

  let retData = Testcontent
    .find({ $or })
    .sort(filters.sort)
    .skip(filters.start)
    .limit(filters.limit)
    .populate(populate);

  if(softDelete){
    retData = retData.where('deleted').ne(!withDeleted);
  }

  return retData;
};

// Main Exports
module.exports = {
  fetchAll,
  fetch,
  search,
  count,
  add,
  edit,
  remove,
  softDelete,
  restore,
  rollback
};
