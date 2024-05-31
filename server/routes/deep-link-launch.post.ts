import { ZodError, z } from "zod";
import {
  NonceAlreadyUsedError,
  PlatformNotFoundError,
  createToolLtiToken,
  validatePlatformToken,
} from "../utils/auth";
import { getStateCookieName } from "../utils/cookie";
import jwt from "jsonwebtoken";
import useIDTokenStorage, { getIDTokenStorageKey } from "../storage/idToken";

const deepLinkLaunchBodySchema = z.object({
  id_token: z.string(),
  state: z.string(),
});

export default defineEventHandler(async (event) => {
  const { serverUrl } = useRuntimeConfig();
  const body = await readBody(event);
  let idToken, state;
  try {
    ({ id_token: idToken, state } = await deepLinkLaunchBodySchema.parseAsync(
      body
    ));
  } catch (error: any) {
    console.error("Error parsing launch body", error);
    if (error instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Something went wrong",
    });
  }

  let tokenPayload;
  try {
    tokenPayload = await validatePlatformToken(idToken);
  } catch (error) {
    console.error("Error validating platform token", error);
    if (error instanceof PlatformNotFoundError) {
      throw createError({
        statusCode: 404,
        statusMessage: error.message,
      });
    }
    if (error instanceof NonceAlreadyUsedError) {
      throw createError({
        statusCode: 401,
        statusMessage: error.message,
      });
    }
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid token",
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Something went wrong",
    });
  }

  const cookieName = getStateCookieName(state);
  const issuer = getCookie(event, cookieName);
  deleteCookie(event, cookieName);
  if (!issuer || tokenPayload.iss !== issuer) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid state",
    });
  }

  const idTokenStorage = useIDTokenStorage();
  const idTokenStorageKey = getIDTokenStorageKey({
    issuer: tokenPayload.iss,
    clientId: tokenPayload.aud,
    deploymentId:
      tokenPayload["https://purl.imsglobal.org/spec/lti/claim/deployment_id"],
    userId: tokenPayload.sub,
  });
  console.info("Storing ID token: ", idTokenStorageKey, tokenPayload);
  await idTokenStorage.setItem(idTokenStorageKey, tokenPayload);

  const ltiToken = createToolLtiToken(tokenPayload);
  const url = new URL("deep-link-select", serverUrl);
  url.searchParams.append("lti", ltiToken);
  return sendRedirect(event, url.href);
});
