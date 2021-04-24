import { inferShapes } from './inferencer';
import { loadJsonTree } from './json-parser';
import { JsonType, serialize } from './serializer';

export type {
  AnyType,
  ArrayType,
  JsonType,
  NamedType,
  ObjectField,
  ObjectType,
  PrimitiveType,
  UnionType,
} from './serializer';

export function guess(json: unknown): JsonType[] {
  const parsed = loadJsonTree(json);
  const { root, objectMap } = inferShapes(parsed);
  return serialize(objectMap, root);
}
