// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

const d = require("debug")("bot-azure");

const azure = require("azure-storage");
const entGen = azure.TableUtilities.entityGenerator;

interface AzStorageOptions {
  storageAccount: string;
  storageKey: string;
  tableName: string;
}

export class AzStorage implements AzStorageOptions {
  public storageAccount: string;
  public storageKey: string;
  public tableName: string;
  private initialized: boolean;

  private svc: any; // TODO:

  constructor(options: AzStorageOptions) {
    Object.assign(this, options);
    // this.storageAccount = options.storageAccount;
    // this.storageKey = options.storageKey;
    // this.tableName = options.tableName;
    this.initialized = false;
  }

  private Init(): Promise<boolean> {
    if (this.svc != undefined) {
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

  async GetNextReadingId(user): Promise<number> {
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

  UpdateUserLastReading(user, rowId): Promise<any> {
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

  async NewReading(
    user: string,
    volume: number,
    price: number,
    distance: number,
    partial: boolean = false,
    date: Date = new Date(Date.now())
  ): Promise<any> {
    if (!this.initialized) {
      await this.Init();
    }
    let partition = "UserReadings";
    let rowId = await this.GetNextReadingId(user);
    let rowKey = `Reading_${user}_${rowId}`;
    let entity = {
      PartitionKey: entGen.String(partition),
      RowKey: entGen.String(rowKey),
      Distance: entGen.Int32(distance),
      Volume: entGen.Double(volume),
      Price: entGen.Double(price),
      Partial: entGen.Boolean(partial),
      Date: entGen.DateTime(date),
    };

    await this.AddEntity(entity);
    let result = await this.UpdateUserLastReading(user, rowId);
    return result;
  }

  ClearReadings(user: string) {}

  Stats(user: string) {}
}
