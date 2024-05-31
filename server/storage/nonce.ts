export default function useNonceStorage() {
  return useStorage<boolean>("nonce");
}
