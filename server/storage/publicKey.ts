export default function usePublicKeyStorage() {
  return useStorage<string>("publicKey");
}
