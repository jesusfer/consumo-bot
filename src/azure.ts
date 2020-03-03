// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

import {
  IStorageService,
  IStorageKey,
  StorageKeyType,
  IBotStorageOptions,
  newLastReading,
} from "./storage";

const d = require("debug")("bot-azure");
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

  private azureService: azure.TableService;

  public WithOptions(options: IAzureStorageOptions): this {
    Object.assign(this, options);
    this.initialized = false;
    return this;
  }

  public Init(): Promise<boolean> {
    if (this.azureService != undefined && this.initialized) {
      return Promise.resolve(true);
    }
    d("AzureStorage.Init");
    this.azureService = azure.createTableService(this.storageAccount, this.storageKey);
    return new Promise((resolve, reject) => {
      this.azureService.createTableIfNotExists(this.tableName, (error, result) => {
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
    d("AzureStorage.GetStorageKey");
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
          row: `User_${options.User}`,
        });
        break;
      case StorageKeyType.ReadingKey:
        Object.assign(newKey, {
          keyType: StorageKeyType.LastReadingKey,
          partition: `UserReadings`,
          row: `Reading_${options.User}_${options.ReadingId}`,
        });
        break;
      default:
        throw new Error("KeyType not supported");
    }
    return newKey;
  }

  public async Get(key: IAzureStorageKey): Promise<any> {
    d("AzureStorage.Get");
    console.log(key);
    await this.Init();
    let promise = new Promise((resolve, reject) => {
      this.azureService.retrieveEntity(this.tableName, key.partition, key.row, (error, result) => {
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
      d("AzureStorage.Get: Got result");
    } catch (error) {
      getError = error;
      d("AzureStorage.Get: Got error!");
    }
    switch (key.keyType) {
      case StorageKeyType.LastReadingKey:
        d("AzureStorage.Get: LastReading result");
        if (getError) {
          if (getError.message.indexOf("The specified resource does not exist.") >= 0) {
            return Promise.resolve(newLastReading(1));
          }
          return Promise.reject(getError);
        } else {
          let readingId = getResult.Last._ + 1;
          return Promise.resolve(newLastReading(readingId));
        }
      case StorageKeyType.ReadingKey:
        d("AzureStorage.Get: Reading result");
        // TODO Return a Reading
        break;
      default:
        throw new Error("KeyType not supported");
    }
  }

  public async Add(key: IStorageKey, entity: any): Promise<void> {
    d("AzureStorage.Add");
    await this.Init();
    let newEntity = this.ExtendEntityWithPartitionAndRowKeys(key as IAzureStorageKey, entity);
    return new Promise((resolve, reject) => {
      this.azureService.insertEntity(this.tableName, newEntity, (error, result) => {
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
    d("AzureStorage.AddOrUpdate");
    await this.Init();
    let newEntity = this.ExtendEntityWithPartitionAndRowKeys(key as IAzureStorageKey, entity);
    return new Promise((resolve, reject) => {
      this.azureService.insertOrReplaceEntity(this.tableName, newEntity, (error, result) => {
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
    d("AzureStorage.ExtendEntityWithPartitionAndRowKeys");
    let extras = {
      PartitionKey: entGen.String(key.partition),
      RowKey: entGen.String(key.row),
    };
    Object.assign(extras, entity);
    console.log(extras);
    return extras;
  }
}
