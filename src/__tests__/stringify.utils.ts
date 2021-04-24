import { JsonType, AnyType } from '../serializer';
import { format } from 'prettier';

function stringifyType(type: AnyType): string {
  switch (type.kind) {
    case 'named':
      return type.name;
    case 'primitive':
      return type.type;
    case `union`:
      return type.types.map((e) => stringifyType(e)).join(' | ');
    case 'array':
      return `Array<${stringifyType(type.type)}>`;
  }
  throw new Error(`Can't deal with type ${type.kind} in test serializer`);
}

function stringifyJsonType(jsonType: JsonType): string {
  switch (jsonType.type.kind) {
    case 'array':
      return `type ${jsonType.name} = Array<${stringifyType(
        jsonType.type.type,
      )}>`;
    case 'object': {
      const fields = jsonType.type.fields.map(
        (e) => `${e.name}${e.nullable ? '?' : ''}: ${stringifyType(e.type)}`,
      );
      return `type ${jsonType.name} = {
      ${fields.join('\n')}
      };

      `;
    }
    default:
      throw new Error(
        `Can't deal with JsonType ${jsonType.type} in test serializer`,
      );
  }
}

export function stringify(jsonTypes: JsonType[]): string {
  const src = jsonTypes.map(stringifyJsonType).join('\n\n');
  const formatted = format(src, {
    parser: 'typescript',
    semi: true,
    trailingComma: 'all',
  });

  return `-\n${formatted}`;
}
