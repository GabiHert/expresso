import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { WatchResponse } from "./watch_service";
import type { WatchRequest } from "./watch_service";
import * as grpc from "@grpc/grpc-js";
/**
 * @generated from protobuf service authzed.api.v1.WatchService
 */
export interface IWatchServiceClient {
    /**
     * @generated from protobuf rpc: Watch(authzed.api.v1.WatchRequest) returns (stream authzed.api.v1.WatchResponse);
     */
    watch(input: WatchRequest, metadata?: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<WatchResponse>;
    watch(input: WatchRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<WatchResponse>;
}
/**
 * @generated from protobuf service authzed.api.v1.WatchService
 */
export declare class WatchServiceClient extends grpc.Client implements IWatchServiceClient {
    private readonly _binaryOptions;
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: grpc.ClientOptions, binaryOptions?: Partial<BinaryReadOptions & BinaryWriteOptions>);
    /**
     * @generated from protobuf rpc: Watch(authzed.api.v1.WatchRequest) returns (stream authzed.api.v1.WatchResponse);
     */
    watch(input: WatchRequest, metadata?: grpc.Metadata | grpc.CallOptions, options?: grpc.CallOptions): grpc.ClientReadableStream<WatchResponse>;
}
