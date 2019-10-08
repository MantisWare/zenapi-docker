"use strict";

const mongoose = require('mongoose');
const async = require('async');
const _ = require('lodash');

const historyModels = {};
var Schema = mongoose.Schema;

/**
 * Create and cache a history mongoose model
 * @param {string} collectionName Name of history collection
 * @return {mongoose.Model} History Model
 */
const HistoryModel = function(collectionName, options) {
  const indexes = options && options.indexes;
  const historyConnection = (options && options.historyConnection)?options.historyConnection:zenapi.mongo;
  const metadata = options && options.metadata;

  let schemaObject = {
    ref: {type: Schema.Types.ObjectId, required: true},
    v: {type: Schema.Types.Number, required: true},
    t: {type: Date, required: true},
    o: {type: String, required: true},
    d: {type: mongoose.Schema.Types.Mixed, required: true}
  }
  if (metadata){
    metadata.forEach((m) =>{
      schemaObject[m.key] = m.schema || {type: mongoose.Schema.Types.Mixed}
    })
  }
  if (!(collectionName in historyModels)) {
    let schema = new mongoose.Schema(schemaObject, { id: true, versionKey: false });
    schema.index({ref: 1}, {unique: false}); // IDX

    if(indexes){
      indexes.forEach(function(idx) {
        schema.index(idx);
      });
    }

    if(historyConnection) {
      historyModels[collectionName] = historyConnection.model(collectionName, schema, collectionName);
    } else {
      historyModels[collectionName] = mongoose.model(collectionName, schema, collectionName);
    }

  }

  return historyModels[collectionName];
};

/**
 * Set name of history collection
 * @param {string} collectionName history collection name
 * @param {string} customCollectionName history collection name defined by user
 * @return {string} Collection name of history
 */
const historyCollectionName = function(collectionName) {
  return '_history_' + collectionName;
};

function createHistoryDoc(d, operation) {
  // Set version
  if(d.__v != undefined && d.__v > -1){
    d.__v = d.__v+1;
  } else {
    d.__v = 0;
  }

  let historyDoc = {};
  historyDoc['ref'] = d._id;
  historyDoc['v'] = d.__v;
  historyDoc['t'] = new Date();
  historyDoc['o'] = operation;
  historyDoc['d'] = d;

  return historyDoc;
}

/**
 * Save History Record
 * 
 * @param {Object} data Data To save
 * @param {this.opperation} opperation Enum opperation type
 * @param {string} collectionName Model name
 * @param {Object} options additional options {indexes, historyConnection, metadata} (Optional)
 * @return {int} Returns New Version no.
 */
const SaveHistoryModel = async function(data, opperation, collectionName, options) {
  try{
    let historyDoc = createHistoryDoc(data, opperation);

    let history = new HistoryModel(historyCollectionName(collectionName), options)(historyDoc);
    let ret = await history.save();

    return ret.v;
  } catch(err){
    zenapi.log.error('[SaveHistoryModel]',err);
  }
}

/**
 * Get all history
 * 
 * @param {string} collectionName Model name
 * @param {Object} params contain search params exa. _id:''
 * @param {this.opperation} opperation Enum opperation type (Optional)
 * @return {Promise} Mongoose Find promise
 */
const LoadHistory = async function(collectionName, params, version, opperation) {
  try{
    let history = new HistoryModel(historyCollectionName(collectionName), {});
    let data = history.find({ ref: params._id }).sort({ date: 1 });
    if(opperation){
      data = data.where('o').eq(opperation);
    }

    return data.exec().then(function (docVersions) {
      return new Promise(function (resolve, reject) {
        if(version){
          let _f = docVersions.filter(f => f.v === version);
          if (_f.length <= 0) {
            return reject("Version doesn't exist");
          } else{
            let retData = _f[0];
            resolve(retData);
          }
        } else {
          resolve(docVersions);
        }
      });
    });
  } catch(err){
    zenapi.log.error('[SaveHistoryModel]',err);
  }
}

const opperations = {
  insert: 'i',
  update: 'u',
  delete: 'd',
  restore: 'r'
}

module.exports = {
  opperations,
  SaveHistory: SaveHistoryModel,
  GetHistory: LoadHistory
}