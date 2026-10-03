export function newRunId(): string {
  // Generate a random string of 16 characters (alphanumeric)
  const randomString = Math.random().toString(36).substring(2, 18);
  return randomString;
}
