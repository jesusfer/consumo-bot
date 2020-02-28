// Copyright (c) 2018 Jesús Fernández <jesus@nublar.net>
// MIT License

"use strict";

const d = require("debug")("bot-azure");

const azure = require("azure-storage");
const entGen = azure.TableUtilities.entityGenerator;

class AzStorage {
  constructor(options) {
    this.storageAccount = options.storageAccount;
    this.storageKey = options.storageKey;
    this.tableName = options.tableName;
    this.initialized = false;
  }

  Init() {
    if (this.svc == undefined) {
      this.svc = azure.createTableService(this.storageAccount, this.storageKey);
      return new Promise((resolve, reject) => {
        this.svc.createTableIfNotExists(this.tableName, (error, result) => {
          if (error) {
            console.error(`Cannot create destination table: ${result}`);
            reject(error);
          } else {
            d(`Table ${this.tableName} exists in AzAccount`);
            this.initialized = true;
            resolve(true);
          }
        });
      });
    }
  }

  async GetNextReadingRowKey(user) {
    if (!this.initialized) {
      await this.Init();
    }
    let partition = `LastUserRowKey`;
    let row = `User_${user}`;
    return new Promise((resolve, reject) => {
      this.svc.retrieveEntity(this.tableName, partition, row, (error, result) => {
        if (error) {
          if (error.message.indexOf("The specified resource does not exist.") >= 0) {
            d(`First reading for user ${user}?`);
            return resolve(1);
          }
          reject(error);
        } else {
          d(`Last row for user ${user} is ${result.Last._}`);
          let rowId = result.Last._ + 1;
          resolve(rowId);
        }
      });
    });
  }

  LastReadingRowKey(user) {
    let partition = `LastUserRowKey`;
    let row = `User_${user}`;
    return new Promise((resolve, reject) => {
      this.svc.retrieveEntity(this.tableName, partition, row, (error, result) => {
        if (error) {
          reject(error);
        } else {
          d(`Last row for user ${user} is ${result.Last._}`);
          let rowId = result.Last._ + 1;
          resolve(rowId);
        }
      });
    });
  }

  NewReading(user, volume, price, distance, partial, date = new Date(Date.now())) {
    let partition = "UserReadings";
    let row = undefined;
    return this.LastReadingRowKey(user)
      .catch((error) => {
        console.warn(`First access from user?: ${error.message}`);
        if (error.message.indexOf("The specified resource does not exist.") >= 0) {
          return Promise.resolve(1);
        }
        return Promise.reject(error);
      })
      .then((rowId) => {
        row = `Reading_${user}_${rowId}`;
        let ent = {
          PartitionKey: entGen.String(partition),
          RowKey: entGen.String(row),
          Distance: entGen.Int32(distance),
          Volume: entGen.Double(volume),
          Price: entGen.Double(price),
          Partial: entGen.Boolean(partial),
          Date: entGen.DateTime(date),
        };
        return new Promise((resolve, reject) => {
          this.svc.insertEntity(this.tableName, ent, (error, result) => {
            if (error) {
              console.log(error);
              reject(error);
            } else {
              resolve(rowId);
            }
          });
        });
      })
      .then((rowId) => {
        let partition = `LastUserRowKey`;
        let row = `User_${user}`;
        let ent = {
          PartitionKey: entGen.String(partition),
          RowKey: entGen.String(row),
          Last: entGen.Int32(rowId),
        };
        return new Promise((resolve, reject) => {
          this.svc.insertOrReplaceEntity(this.tableName, ent, (error, result) => {
            if (error) {
              reject(error);
            } else {
              result.RowId = rowId;
              resolve(result);
            }
          });
        });
      });
  }

  ClearReadings(user) {}

  Stats(user) {}
}

module.exports = AzStorage;
