interface TransformInput {
  value: unknown;
}

export function trimString({ value }: TransformInput): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

export function trimLowercaseString({ value }: TransformInput): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}

export function trimUppercaseString({ value }: TransformInput): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toUpperCase();
}

export function trimOptionalString({ value }: TransformInput): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
}
