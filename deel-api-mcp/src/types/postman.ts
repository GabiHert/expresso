export interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    schema: string;
    _exporter_id?: string;
    _collection_link?: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

export interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
  event?: PostmanEvent[];
}

export interface PostmanRequest {
  auth?: PostmanAuth;
  method: string;
  header: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl;
}

export interface PostmanAuth {
  type: string;
  bearer?: Array<{
    key: string;
    value: string;
    type: string;
  }>;
}

export interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

export interface PostmanBody {
  mode: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
  raw?: string;
  urlencoded?: PostmanUrlEncodedItem[];
  formdata?: PostmanFormDataItem[];
  options?: {
    raw?: {
      language?: string;
    };
  };
}

export interface PostmanUrlEncodedItem {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
  uuid?: string;
}

export interface PostmanFormDataItem {
  key: string;
  value?: string;
  type?: string;
  src?: string;
  disabled?: boolean;
}

export interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: PostmanQueryParam[];
  variable?: PostmanPathVariable[];
}

export interface PostmanPathVariable {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanQueryParam {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

export interface PostmanEvent {
  listen: 'prerequest' | 'test';
  script: {
    exec: string[];
    type: string;
    packages?: Record<string, unknown>;
  };
}

export interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

export interface PostmanEnvironment {
  id: string;
  name: string;
  values: PostmanEnvironmentValue[];
}

export interface PostmanEnvironmentValue {
  key: string;
  value: string;
  enabled: boolean;
  type?: string;
}

export interface CollectionSummary {
  name: string;
  requestCount: number;
}

export interface RequestSummary {
  collection: string;
  name: string;
  method: string;
  path: string;
}

export interface FlattenedRequest {
  collection: string;
  name: string;
  request: PostmanRequest;
  events?: PostmanEvent[];
}
