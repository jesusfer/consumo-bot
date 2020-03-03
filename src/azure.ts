// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

import {
  IReading,
  IStorageService,
  IStorageKey,
  StorageKeyType,
  IBotStorageOptions,
} from "./storage";

const d = require("debug")("bot-azure");
// const azure = require("azure-storage");
import * as azure from "azure-storage";
const entGen = azure.TableUtilities.entityGenerator;

interface IAzureStorageKey extends IStorageKey {
  partition: string;
  row: string;
}

interface IAzureStorageOptions extends IBotStorageOptions {
  storageAccount: string;
  storageKey: string;
  tableName: string;
}

export class AzureStorage implements IAzureStorageOptions, IStorageService {
  public serviceName: string = "Azure Table Storage";

  public storageAccount: string;
  public storageKey: string;
  public tableName: string;
  private initialized: boolean;

  private svc: any; // TODO:

  constructor(options: IAzureStorageOptions) {
    Object.assign(this, options);
    // this.storageAccount = options.storageAccount;
    // this.storageKey = options.storageKey;
    // this.tableName = options.tableName;
    this.initialized = false;
  }

  private Init(): Promise<boolean> {
    if (this.svc != undefined && this.initialized) {
      return Promise.resolve(true);
    }
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

  public GetStorageKey(keyType: StorageKeyType, options?: any): IAzureStorageKey {
    let newKey: IAzureStorageKey = {
      keyType: keyType,
      partition: undefined,
      row: undefined,
    };
    switch (keyType) {
      case StorageKeyType.LastReadingKey:
        Object.assign(newKey, {
          keyType: StorageKeyType.LastReadingKey,
          partition: `LastUserRowKey`,
          row: `User_${options.user}`,
        });
        break;
      case StorageKeyType.ReadingKey:
        Object.assign(newKey, {
          keyType: StorageKeyType.LastReadingKey,
          partition: `UserReadings`,
          row: `Reading_${options.user}_${options.readingId}`,
        });
        break;
      default:
        throw new Error("KeyType not supported");
    }
    return newKey;
  }

  public async Get(key: IAzureStorageKey): Promise<any> {
    await this.Init();
    let promise = new Promise((resolve, reject) => {
      this.svc.retrieveEntity(this.tableName, key.partition, key.row, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    let getResult: any;
    let getError: Error;
    try {
      getResult = await promise;
    } catch (error) {
      getError = error;
    }
    switch (key.keyType) {
      case StorageKeyType.LastReadingKey:
        if (getError) {
          if (getError.message.indexOf("The specified resource does not exist.") >= 0) {
            return Promise.resolve(1);
          }
          Promise.reject(getError);
        } else {
          let readingId = getResult.Last._ + 1;
          Promise.resolve(readingId);
        }
        break;
      case StorageKeyType.ReadingKey:
        // TODO:
        break;
      default:
        throw new Error("KeyType not supported");
    }
  }

  public async Add(key: IStorageKey, entity: any): Promise<void> {
    await this.Init();
    let newEntity = this.ExtendEntityWithPartitionAndRowKeys(key as IAzureStorageKey, entity);
    return new Promise((resolve, reject) => {
      this.svc.insertEntity(this.tableName, newEntity, (error, result) => {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  public async AddOrUpdate(key: IStorageKey, entity: any): Promise<void> {
    await this.Init();
    let newEntity = this.ExtendEntityWithPartitionAndRowKeys(key as IAzureStorageKey, entity);
    return new Promise((resolve, reject) => {
      this.svc.insertOrReplaceEntity(this.tableName, newEntity, (error, result) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private ExtendEntityWithPartitionAndRowKeys(key: IAzureStorageKey, entity: any): any {
    let extras = {
      PartitionKey: entGen.String(key.partition),
      RowKey: entGen.String(key.row),
    };
    Object.assign(extras, entity);
    return extras;
  }

  async GetNextReadingId(user: number): Promise<number> {
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

  async AddEntity(entity): Promise<void> {
    if (!this.initialized) {
      await this.Init();
    }
    return new Promise((resolve, reject) => {
      this.svc.insertEntity(this.tableName, entity, (error, result) => {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  UpdateUserLastReading(user: number, rowId: number): Promise<any> {
    let partition = `LastUserRowKey`;
    let row = `User_${user}`;
    let entity = {
      PartitionKey: entGen.String(partition),
      RowKey: entGen.String(row),
      Last: entGen.Int32(rowId),
    };
    return new Promise((resolve, reject) => {
      this.svc.insertOrReplaceEntity(this.tableName, entity, (error, result) => {
        if (error) {
          reject(error);
        } else {
          result.ReadingId = rowId;
          resolve(result);
        }
      });
    });
  }

  async NewReading(reading: IReading): Promise<number> {
    if (!this.initialized) {
      await this.Init();
    }

    let partition = "UserReadings";
    let rowId = await this.GetNextReadingId(reading.user);
    let rowKey = `Reading_${reading.user}_${rowId}`;
    let entity = {
      PartitionKey: entGen.String(partition),
      RowKey: entGen.String(rowKey),
      Distance: entGen.Int32(reading.distance),
      Volume: entGen.Double(reading.volume),
      Price: entGen.Double(reading.price),
      Partial: entGen.Boolean(reading.partial ?? false),
      Date: entGen.DateTime(reading.date ?? new Date(Date.now())),
    };

    await this.AddEntity(entity);
    await this.UpdateUserLastReading(reading.user, rowId);
    return rowId;
  }

  ClearReadings(user: number) {}

  Stats(user: number) {}
}
