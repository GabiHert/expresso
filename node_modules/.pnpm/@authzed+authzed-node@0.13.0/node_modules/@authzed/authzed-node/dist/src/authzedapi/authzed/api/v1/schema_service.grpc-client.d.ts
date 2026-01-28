import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { WriteSchemaResponse } from "./schema_service";
import type { WriteSchemaRequest } from "./schema_service";
import type { ReadSchemaResponse } from "./schema_service";
import type { ReadSchemaRequest } from "./schema_service";
import * as grpc from "@grpc/grpc-js";
/**
 * SchemaService implements operations on a Permissions System's Schema.
 *
 * @generated from protobuf service authzed.api.v1.SchemaService
 */
export interface ISchemaServiceClient {
    /**
     * Read returns the current Object Definitions for a Permissions System.
     *
     * Errors include:
     * - INVALID_ARGUMENT: a provided value has failed to semantically validate
     * - NOT_FOUND: no schema has been defined
     *
     * @generated from protobuf rpc: ReadSchema(authzed.api.v1.ReadSchemaRequest) returns (authzed.api.v1.ReadSchemaResponse);
     */
    readSchema(input: ReadSchemaRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (err: grpc.ServiceError | null, value?: ReadSchemaResponse) => void): grpc.ClientUnaryCall;
    readSchema(input: ReadSchemaRequest, metadata: grpc.Metadata, callback: (err: grpc.ServiceError | null, value?: ReadSchemaResponse) => void): grpc.ClientUnaryCall;
    readSchema(input: ReadSchemaRequest, options: grpc.CallOptions, callback: (err: grpc.ServiceError | null, value?: ReadSchemaResponse) => void): grpc.ClientUnaryCall;
    readSchema(input: ReadSchemaRequest, callback: (err: grpc.ServiceError | null, value?: ReadSchemaResponse) => void): grpc.ClientUnaryCall;
    /**
     * Write overwrites the current Object Definitions for a Permissions System.
     *
     * @generated from protobuf rpc: WriteSchema(authzed.api.v1.WriteSchemaRequest) returns (authzed.api.v1.WriteSchemaResponse);
     */
    writeSchema(input: WriteSchemaRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (err: grpc.ServiceError | null, value?: WriteSchemaResponse) => void): grpc.ClientUnaryCall;
    writeSchema(input: WriteSchemaRequest, metadata: grpc.Metadata, callback: (err: grpc.ServiceError | null, value?: WriteSchemaResponse) => void): grpc.ClientUnaryCall;
    writeSchema(input: WriteSchemaRequest, options: grpc.CallOptions, callback: (err: grpc.ServiceError | null, value?: WriteSchemaResponse) => void): grpc.ClientUnaryCall;
    writeSchema(input: WriteSchemaRequest, callback: (err: grpc.ServiceError | null, value?: WriteSchemaResponse) => void): grpc.ClientUnaryCall;
}
/**
 * SchemaService implements operations on a Permissions System's Schema.
 *
 * @generated from protobuf service authzed.api.v1.SchemaService
 */
export declare class SchemaServiceClient extends grpc.Client implements ISchemaServiceClient {
    private readonly _binaryOptions;
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: grpc.ClientOptions, binaryOptions?: Partial<BinaryReadOptions & BinaryWriteOptions>);
    /**
     * Read returns the current Object Definitions for a Permissions System.
     *
     * Errors include:
     * - INVALID_ARGUMENT: a provided value has failed to semantically validate
     * - NOT_FOUND: no schema has been defined
     *
     * @generated from protobuf rpc: ReadSchema(authzed.api.v1.ReadSchemaRequest) returns (authzed.api.v1.ReadSchemaResponse);
     */
    readSchema(input: ReadSchemaRequest, metadata: grpc.Metadata | grpc.CallOptions | ((err: grpc.ServiceError | null, value?: ReadSchemaResponse) => void), options?: grpc.CallOptions | ((err: grpc.ServiceError | null, value?: ReadSchemaResponse) => void), callback?: ((err: grpc.ServiceError | null, value?: ReadSchemaResponse) => void)): grpc.ClientUnaryCall;
    /**
     * Write overwrites the current Object Definitions for a Permissions System.
     *
     * @generated from protobuf rpc: WriteSchema(authzed.api.v1.WriteSchemaRequest) returns (authzed.api.v1.WriteSchemaResponse);
     */
    writeSchema(input: WriteSchemaRequest, metadata: grpc.Metadata | grpc.CallOptions | ((err: grpc.ServiceError | null, value?: WriteSchemaResponse) => void), options?: grpc.CallOptions | ((err: grpc.ServiceError | null, value?: WriteSchemaResponse) => void), callback?: ((err: grpc.ServiceError | null, value?: WriteSchemaResponse) => void)): grpc.ClientUnaryCall;
}
