import {
  fromPairs,
  groupWith,
  prop,
  propEq,
  sortBy,
  toPairs,
  uniqBy,
} from 'ramda';
import invariant from 'ts-invariant';
import {
  ArrayShape,
  LeafShape,
  ObjectMap,
  ObjectRef,
  ObjectShape,
  ObjectShapeField,
  getObjectHash,
  isObjectRef,
  unwrap,
} from './common';

export interface PrimitiveType {
  kind: 'primitive';
  type: 'boolean' | 'null' | 'number' | 'string' | 'never';
}

export interface NamedType {
  kind: 'named';
  name: string;
}

export interface ObjectField {
  name: string;
  type: AnyType;
  nullable?: boolean;
}

export interface ObjectType {
  kind: 'object';
  fields: ObjectField[];
}

export interface ArrayType {
  kind: 'array';
  type: AnyType;
}

export interface UnionType {
  kind: 'union';
  types: AnyType[];
}

export type AnyType =
  | ArrayType
  | NamedType
  | ObjectType
  | PrimitiveType
  | UnionType;

export interface JsonType {
  name: string;
  type: ArrayType | ObjectType;
  isRoot: boolean;
}

interface JsonArrayType extends JsonType {
  type: ArrayType;
}

function isJsonArrayType(t: JsonType): t is JsonArrayType {
  return t.type.kind === 'array';
}

function titleCase(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}

function coalesceTypes(
  types: (ArrayType | NamedType | PrimitiveType)[],
): PrimitiveType | NamedType | ArrayType | UnionType {
  switch (types.length) {
    case 0:
      return { kind: 'primitive', type: 'never' };
    case 1:
      return types[0];
    default:
      return { kind: 'union', types };
  }
}

function toType(t: LeafShape): NamedType | PrimitiveType | ArrayType {
  switch (t.kind) {
    case 'objectRef':
      return { kind: 'named', name: t.targetId };
    case 'primitive':
      return { kind: 'primitive', type: t.type };
    case 'array':
      return {
        kind: 'array',
        type: coalesceTypes(t.types.map(toType)),
      };
  }
}

function toField(input: ObjectShapeField): ObjectField {
  return {
    name: input.name,
    nullable: input.nullable,
    type: coalesceTypes(input.type.map(toType)),
  };
}

function getJsonTypes(
  objectMap: ObjectMap,
  refOrNode: ArrayShape | ObjectShape | ObjectRef,
): JsonType[] {
  const node = unwrap(objectMap, refOrNode);
  const name = getObjectHash(node);

  if (node.kind === 'object') {
    const nestedTypes = node.fields
      .flatMap(prop('type'))
      .filter((e) => e.kind !== 'primitive')
      .flatMap((e) => {
        invariant(e.kind !== 'primitive');
        return getJsonTypes(objectMap, e);
      });

    const thisType: JsonType = {
      name,
      isRoot: false,
      type: {
        kind: 'object',
        fields: node.fields.map(toField),
      },
    };
    return uniqBy(prop('name'), [...nestedTypes, thisType]);
  } else if (node.kind === 'array') {
    const nestedTypes = node.types
      .filter(isObjectRef)
      .flatMap((e) => getJsonTypes(objectMap, e));
    const arrayType = coalesceTypes(node.types.map(toType));

    const thisType: JsonType = {
      name,
      isRoot: false,
      type: {
        kind: 'array',
        type: arrayType,
      },
    };
    return uniqBy(prop('name'), [...nestedTypes, thisType]);
  } else {
    throw new Error('nop');
  }
}

function updateNodeNames(names: Record<string, string>, node: AnyType): void {
  switch (node.kind) {
    case 'named': {
      node.name = names[node.name];
      break;
    }

    case 'array': {
      updateNodeNames(names, node.type);
      break;
    }

    case 'object': {
      node.fields.forEach((field) => updateNodeNames(names, field.type));
      break;
    }

    case 'union': {
      node.types.forEach((e) => updateNodeNames(names, e));
      break;
    }
  }
}

function getNamedLeaves(type: AnyType): NamedType[] {
  switch (type.kind) {
    case 'named':
      return [type];
    case 'array':
      return getNamedLeaves(type.type);
    case 'union':
      return type.types.flatMap(getNamedLeaves);
    case 'primitive':
      return [];
    case 'object': {
      throw new Error('this is not possible I think');
    }
  }
}

function guessNames(jsonTypes: JsonType[], entrypointId: string): JsonType[] {
  // default all JsonType objects to be names "Guessed"
  const names: Record<string, string> = Object.fromEntries(
    jsonTypes.map((e) => [
      e.name,
      e.name === entrypointId ? 'Root' : 'Guessed',
    ]),
  );

  // overwrite the defaults with object keys, if an object key points to one
  // of the names
  for (const jsonType of jsonTypes) {
    if (jsonType.type.kind === 'object') {
      for (const field of jsonType.type.fields) {
        const namedLeaves = getNamedLeaves(field.type);
        if (namedLeaves.length === 1) {
          names[namedLeaves[0].name] = titleCase(field.name);
        }
      }
    }
  }

  const sortedPairs = sortBy((e) => e[1], toPairs(names));
  const groups = groupWith((a, b) => a[1] === b[1], sortedPairs);

  const newNames = groups.flatMap((group) => {
    return group.length === 1
      ? group
      : group.map(([id, name], n) => [id, `${name}${n + 1}`]);
  });

  const nameMap = fromPairs(newNames as [string, string][]);
  for (const jsonType of jsonTypes) {
    jsonType.name = nameMap[jsonType.name];
    updateNodeNames(nameMap, jsonType.type);
  }
  return jsonTypes;
}

function updateNamedTypes(
  type: AnyType,
  name: string,
  replacement: AnyType,
): AnyType {
  switch (type.kind) {
    case 'primitive':
      return type;

    case 'union':
      return {
        kind: 'union',
        types: type.types.map((e) => updateNamedTypes(e, name, replacement)),
      };

    case 'array':
      return {
        kind: 'array',
        type: updateNamedTypes(type.type, name, replacement),
      };

    case 'object':
      return {
        kind: 'object',
        fields: type.fields.map((e) => ({
          ...e,
          type: updateNamedTypes(e.type, name, replacement),
        })),
      };

    case 'named':
      return type.name === name ? replacement : type;
  }
}

function updateJsonTypeNames(
  subject: ArrayType | ObjectType,
  id: string,
  replacement: AnyType,
): ArrayType | ObjectType {
  const newType = updateNamedTypes(subject, id, replacement);
  invariant(newType.kind === 'array' || newType.kind === 'object');
  return newType;
}

function removeArrayJsonTypes(
  jsonTypes: JsonType[],
  rootId: string,
): JsonType[] {
  const arrayPairs = jsonTypes
    .filter((e) => e.name !== rootId)
    .filter(isJsonArrayType)
    .map<[string, AnyType]>((e) => [
      e.name,
      { kind: 'array', type: e.type.type },
    ]);

  // this is pretty dumb.. . The result of it is to flatten all
  // referenced arrays, up to a nesting level of 5. This should
  // be rewritten in a better way
  for (let n = 0; n < 5; n++) {
    for (const jsonType of jsonTypes) {
      for (const [id, type] of arrayPairs) {
        jsonType.type = updateJsonTypeNames(jsonType.type, id, type);
      }
    }
  }

  return jsonTypes.filter((e) => e.name === rootId || !isJsonArrayType(e));
}

export function serialize(
  objectMap: ObjectMap,
  root: ArrayShape | ObjectShape,
): JsonType[] {
  const rootId = getObjectHash(root);
  invariant(root, "Root node doesn't exist");
  const jsonTypes = getJsonTypes(objectMap, root);
  const pruned = removeArrayJsonTypes(jsonTypes, rootId);
  const entryPoint = pruned.find(propEq('name', rootId));

  invariant(entryPoint, 'entrypoint not found');
  entryPoint.isRoot = true;
  guessNames(pruned, rootId);
  return pruned;
}
