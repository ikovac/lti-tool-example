import { IDTokenPayload } from "../types/idToken";

export function getIDTokenStorageKey({
  issuer,
  clientId,
  deploymentId,
  userId,
}: {
  issuer: string;
  clientId: string;
  deploymentId: string;
  userId: string;
}) {
  return `${issuer}:${clientId}:${deploymentId}:${userId}`;
}

export default function useIDTokenStorage() {
  return useStorage<IDTokenPayload>("idToken");
}
