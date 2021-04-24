export type JsonArrayNode = {
  kind: 'array';
  children: JsonNode[];
};

export type JsonObjectNode = {
  kind: 'object';
  children: { key: string; value: JsonNode }[];
};

export type JsonPrimitiveNode = {
  kind: 'primitive';
  type: 'string' | 'boolean' | 'number' | 'null';
};

export type JsonNode = JsonArrayNode | JsonObjectNode | JsonPrimitiveNode;

export function loadJsonTree(root: unknown): JsonNode {
  const nodeType = typeof root;
  if (
    nodeType === 'string' ||
    nodeType === 'number' ||
    nodeType === 'boolean'
  ) {
    return { kind: 'primitive', type: nodeType };
  } else if (root === null) {
    return { kind: 'primitive', type: 'null' };
  } else if (Array.isArray(root)) {
    return { kind: 'array', children: root.map(loadJsonTree) };
  } else if (root && typeof root === 'object') {
    return {
      kind: 'object',
      children: Object.entries(root).map(([key, val]) => ({
        key,
        value: loadJsonTree(val),
      })),
    };
  } else {
    throw new Error('Unable to parse JSON');
  }
}
