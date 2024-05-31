export default function usePrivateKeyStorage() {
  return useStorage<string>("privateKey");
}
