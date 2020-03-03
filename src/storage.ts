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
  user: number;
  volume: number;
  price: number;
  distance: number;
  partial?: boolean;
  date?: Date;
  readingId?: number;
}

export interface ILastReading {
  last: number;
}

export function newLastReading(readingId: number): ILastReading {
  return {
    last: readingId,
  };
}
export interface IBotStorageOptions {}

interface IBotStorage {
  GetNextReadingId(user: number): Promise<number>;
  NewReading(reading: IReading): Promise<number>;
}

export class BotStorage implements IBotStorageOptions, IBotStorage {
  private service: IStorageService;

  public WithOptions(options: IBotStorageOptions): BotStorage {
    Object.assign(this, options);
    return this;
  }

  public WithService(service: IStorageService): BotStorage {
    this.service = service;
    return this;
  }

  async GetNextReadingId(user: number): Promise<number> {
    d(`Getting next reading id for user ${user}`);
    let key = this.service.GetStorageKey(StorageKeyType.LastReadingKey, {
      user: user,
    });
    let result = (await this.service.Get(key)) as ILastReading;
    d(`Next reading id for user is ${result.last}`);
    return result.last;
  }

  async NewReading(options: IReading): Promise<number> {
    d(`Storing new reading`);
    const newReadingId = await this.GetNextReadingId(options.user);
    options.readingId = newReadingId;
    const key = this.service.GetStorageKey(StorageKeyType.ReadingKey, options);
    await this.service.Add(key, options);
    d(`New reading stored with id: ${newReadingId}`);
    return newReadingId;
  }
}
