import { randomBytes, generateKeyPairSync } from "node:crypto";
import jwt, { GetPublicKeyOrSecret, Secret, VerifyOptions } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import usePublicKeyStorage from "../storage/publicKey";
import usePrivateKeyStorage from "../storage/privateKey";
import { IDTokenPayload } from "../types/idToken";
import usePlatformStorage from "../storage/platform";
import useNonceStorage from "../storage/nonce";
import { Platform } from "../types/platform";

export async function generatePlatformKeyPair(): Promise<string> {
  const publicKeyStorage = usePublicKeyStorage();
  const privateKeyStorage = usePrivateKeyStorage();
  const kid = randomBytes(16).toString("hex");

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  console.info("Storing public and private keys for platform", kid);
  console.info({ publicKey, privateKey });
  await publicKeyStorage.setItem(kid, publicKey);
  await privateKeyStorage.setItem(kid, privateKey);

  return kid;
}

export class PlatformNotFoundError extends Error {
  constructor() {
    super("Platform not found.");
    this.name = this.constructor.name;
  }
}

export class NonceAlreadyUsedError extends Error {
  constructor() {
    super("Nonce already used.");
    this.name = this.constructor.name;
  }
}

export class PlatformPrivateKeyNotFoundError extends Error {
  constructor() {
    super("Platform private key not found.");
    this.name = this.constructor.name;
  }
}

export async function validatePlatformToken(
  idToken: string
): Promise<IDTokenPayload> {
  const platformStorage = usePlatformStorage();
  const decodedIdToken = jwt.decode(idToken, { complete: true });
  const payload = decodedIdToken?.payload as IDTokenPayload;
  const { aud, iss, nonce } = payload;

  const platform = await platformStorage.getItem(`${iss}:${aud}`);
  if (!platform) throw new PlatformNotFoundError();
  const { authConfig, clientId } = platform;

  await jwtVerify(
    idToken,
    (header, callback) => {
      const client = jwksRsa({ jwksUri: authConfig.key });
      client.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key?.getPublicKey());
      });
    },
    {
      algorithms: ["RS256"],
      audience: clientId,
    }
  );

  const nonceStorage = useNonceStorage();
  if (await nonceStorage.hasItem(nonce)) throw new NonceAlreadyUsedError();
  await nonceStorage.setItem(nonce, true);

  return payload;
}

export function createToolLtiToken(idTokenPaylod: IDTokenPayload): string {
  const { jwtSecret, serverUrl } = useRuntimeConfig();
  return jwt.sign(
    {
      userId: idTokenPaylod.sub,
      clientId: idTokenPaylod.aud,
      platformUrl: idTokenPaylod.iss,
      deploymentId:
        idTokenPaylod[
          "https://purl.imsglobal.org/spec/lti/claim/deployment_id"
        ],
    },
    jwtSecret,
    {
      issuer: serverUrl,
      expiresIn: "1h",
    }
  );
}

export async function getAccessToken(
  platform: Platform,
  scopes: string[]
): Promise<{ tokenType: string; accessToken: string }> {
  const privateKeyStorage = usePrivateKeyStorage();
  const platformPrivateKey = await privateKeyStorage.getItem(platform.kid);
  if (!platformPrivateKey) throw new PlatformPrivateKeyNotFoundError();

  const randomJti = encodeURIComponent(
    [...Array(25)].map((_) => ((Math.random() * 36) | 0).toString(36)).join("")
  );

  const token = jwt.sign(
    {
      sub: platform.clientId,
      iss: platform.clientId,
      aud: platform.accesstokenEndpoint,
      jti: randomJti,
    },
    platformPrivateKey,
    {
      algorithm: "RS256",
      expiresIn: "1h",
      keyid: platform.kid,
    }
  );

  const message = {
    grant_type: encodeURIComponent("client_credentials"),
    client_assertion_type: encodeURIComponent(
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    ),
    client_assertion: encodeURIComponent(token),
    scope: encodeURIComponent(scopes.join(" ")),
  };

  const body = Object.entries(message)
    .map(([key, value]: [any, any]) => `${key}=${value}`)
    .join("&");

  const result: string = await $fetch(platform.accesstokenEndpoint, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const { token_type: tokenType, access_token: accessToken } =
    JSON.parse(result);
  return { tokenType, accessToken };

  // Access token:  {
  //   "access_token" : "7f41d254e2d8186a92b8c127b8ad26f4",
  //   "token_type" : "Bearer",
  //   "expires_in" : 3600,
  //   "scope" : "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly"
  // }
}

export function jwtVerify(
  token: string,
  secretOrPublicKey: Secret | GetPublicKeyOrSecret,
  options?: VerifyOptions
) {
  return new Promise((resolve, reject) => {
    return jwt.verify(token, secretOrPublicKey, options, (err, decoded) => {
      if (err) return reject(err);
      return resolve(decoded);
    });
  });
}
