// Copyright (c) 2020 Jesús Fernández <jesus@nublar.net>
// MIT License

const d = require("debug")("bot-storage");

export enum StorageKeyType {
  LastReadingKey,
  ReadingKey,
}

export interface IStorageKey {
  keyType: StorageKeyType;
}

export interface IStorageService {
  readonly serviceName: string;
  Get(key: IStorageKey): Promise<any>;
  Add(key: IStorageKey, entity: any): Promise<void>;
  AddOrUpdate(key: IStorageKey, entity: any): Promise<void>;
  GetStorageKey(keyType: StorageKeyType, options?: any): IStorageKey;
}

export interface IReading {
  User: number;
  Volume: number;
  Price: number;
  Distance: number;
  Partial?: boolean;
  Date?: Date;
  ReadingId?: number;
}

export interface ILastReading {
  Last: number;
}

export function newLastReading(readingId: number): ILastReading {
  return {
    Last: readingId,
  };
}
export interface IBotStorageOptions {}

interface IBotStorage {
  GetNextReadingId(user: number): Promise<number>;
  NewReading(reading: IReading): Promise<number>;
}

export class BotStorage implements IBotStorageOptions, IBotStorage {
  private service: IStorageService;

  public WithOptions(options: IBotStorageOptions): this {
    Object.assign(this, options);
    return this;
  }

  public WithService(service: IStorageService): this {
    this.service = service;
    return this;
  }

  async GetNextReadingId(user: number): Promise<number> {
    d(`Getting next reading id for user ${user}`);
    let key = this.service.GetStorageKey(StorageKeyType.LastReadingKey, {
      User: user,
    });
    let result = (await this.service.Get(key)) as ILastReading;
    d(`Next reading id for user is ${result.Last}`);
    return result.Last;
  }

  async NewReading(options: IReading): Promise<number> {
    d(`Storing new reading`);
    const newReadingId = await this.GetNextReadingId(options.User);
    options.ReadingId = newReadingId;
    const newReadingKey = this.service.GetStorageKey(StorageKeyType.ReadingKey, options);
    await this.service.Add(newReadingKey, options);
    const lastReadingKey = this.service.GetStorageKey(StorageKeyType.LastReadingKey, options);
    await this.service.AddOrUpdate(lastReadingKey, newLastReading(newReadingId));
    d(`New reading stored with id: ${newReadingId}`);
    return newReadingId;
  }
}
