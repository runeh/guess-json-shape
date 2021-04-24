import { intersection, prop, propEq, uniq, uniqBy } from 'ramda';
import invariant from 'ts-invariant';
import {
  ArrayShape,
  LeafShape,
  NonRefShape,
  ObjectMap,
  ObjectRef,
  ObjectShape,
  getObjectHash,
  isArrayShape,
  isObjectShape,
  isPrimitive,
  notEmpty,
  saveObject,
  unwrap,
} from './common';
import { JsonArrayNode, JsonNode, JsonObjectNode } from './json-parser';

function inferObjectShape(
  objectMap: ObjectMap,
  node: JsonObjectNode,
): ObjectRef {
  const obj: ObjectShape = {
    kind: 'object',
    fields: node.children.map((field) => ({
      name: field.key,
      type: [inferNodeShape(objectMap, field.value)],
    })),
  };

  return saveObject(objectMap, obj);
}

function mergeObjects(objectMap: ObjectMap, shapes: ObjectShape[]): ObjectRef {
  const allKeys = uniq(shapes.flatMap(prop('fields')).map(prop('name')));
  const commonKeys = shapes
    .map((shape) => shape.fields.map(prop('name')))
    .reduce(intersection);

  const ret: ObjectShape = {
    kind: 'object',
    fields: allKeys.map((e) => {
      const candidates = shapes
        .map((shape) => shape.fields.find(propEq('name', e)))
        .filter(notEmpty)
        .flatMap(prop('type'))
        .map((e) => unwrap(objectMap, e));

      const nullable = !commonKeys.includes(e);
      const merged = mergeShapes(objectMap, candidates);
      return { name: e, type: merged, nullable };
    }),
  };

  return saveObject(objectMap, ret);
}

function mergeShapes(objectMap: ObjectMap, shapes: NonRefShape[]): LeafShape[] {
  if (shapes.every(isPrimitive)) {
    return uniqBy(getObjectHash, shapes);
  } else if (shapes.every(isObjectShape)) {
    const thing = mergeObjects(objectMap, shapes);
    return [thing];
  } else if (shapes.every(isArrayShape)) {
    const uniques = uniqBy(getObjectHash, shapes.flatMap(prop('types')));
    const arr: ArrayShape = { kind: 'array', types: uniques };
    return [arr];
  } else {
    const objects = mergeShapes(objectMap, shapes.filter(isObjectShape));
    const arrays = mergeShapes(objectMap, shapes.filter(isArrayShape));
    const primitives = mergeShapes(objectMap, shapes.filter(isPrimitive));
    return [...objects, ...arrays, ...primitives];
  }
}

function inferArrayShape(
  objectMap: ObjectMap,
  node: JsonArrayNode,
): ArrayShape {
  const resolvedTypes = node.children.map((e) => inferNodeShape(objectMap, e));
  const uniqueResolvedShapes = uniqBy(getObjectHash, resolvedTypes);
  const unwrapped = uniqueResolvedShapes.map((e) => unwrap(objectMap, e));
  const union = mergeShapes(objectMap, unwrapped);
  const ret: ArrayShape = { kind: 'array', types: union };
  return ret;
}

function inferNodeShape(objectMap: ObjectMap, node: JsonNode): LeafShape {
  switch (node.kind) {
    case 'primitive':
      return node;
    case 'array':
      return inferArrayShape(objectMap, node);
    case 'object':
      return inferObjectShape(objectMap, node);
  }
}

export function inferShapes(
  node: JsonNode,
): { root: ArrayShape | ObjectShape; objectMap: ObjectMap } {
  const objectMap: ObjectMap = new Map();
  invariant(node.kind !== 'primitive', 'JSON root must be array or object');
  const root = inferNodeShape(objectMap, node);
  const unwrappedRoot = unwrap(objectMap, root);
  invariant(unwrappedRoot.kind !== 'primitive', 'cant be primitive');
  return { root: unwrappedRoot, objectMap };
}
