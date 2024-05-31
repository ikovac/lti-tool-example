import Jwk from "rasha";
import usePublicKeyStorage from "../storage/publicKey";

export default defineEventHandler(async () => {
  const publicKeyStorage = usePublicKeyStorage();
  const kids = await publicKeyStorage.getKeys();
  const pKeys = kids.map(async (kid) => {
    const key = await publicKeyStorage.getItem(kid);
    if (!key) return;
    const jwk = await Jwk.import({ pem: key, public: true });
    return { ...jwk, kid, alg: "RS256", use: "sig" };
  });
  const keys = await Promise.all(pKeys);
  return { keys };
});
