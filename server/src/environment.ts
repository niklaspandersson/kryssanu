/**
 * Reads an boolean value from the environment.
 * Throws an error if not found and no default value is provided
 * @param name The environment variable to read
 * @param defaultValue The default value to use if no value is found in the environment. Pass undefined to make the variable mandatory
 */
export function getEnvFlag(name: string, defaultValue?: boolean) {
  const value = getEnv(
    name,
    !isUndefined(defaultValue) ? (defaultValue ? "true" : "false") : undefined
  );
  return value!.toLocaleLowerCase() === "true";
}

/**
 * Reads an integer value from the environment. Throws an error if not found and no default value is provided
 * @param name The environment variable to read
 * @param defaultValue The default value to use if no value is found in the environment. Pass undefined to make the variable mandatory
 */
export function getEnvInt(name: string, defaultValue?: number) {
  const value = getEnv(
    name,
    !isUndefined(defaultValue) ? defaultValue.toString(10) : undefined
  );
  const res = parseInt(value!, 10);
  if (isNaN(res)) throw new Error(`env ${name} is not a number`);
  return res;
}

/**
 * Reads a string value from the environment. Throws an error if not found and no default value is provided
 * @param name The environment variable to read
 * @param defaultValue The default value to use if no value is found in the environment. Pass undefined to make the variable mandatory
 */
export function getEnv(name: string, defaultValue?: string | null) {
  const required = isUndefined(defaultValue);
  const value = process.env[name];

  if (isUndefined(value)) {
    if (required) throw new Error(`env ${name} is required`);

    return defaultValue!;
  }

  return value;
}

function isUndefined(value: any): value is undefined {
  return typeof value === "undefined";
}
