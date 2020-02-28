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

interface IReading {
  user: number;
  volume: number;
  price: number;
  distance: number;
  partial?: boolean;
  date?: Date;
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
