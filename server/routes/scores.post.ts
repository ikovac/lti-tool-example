import { ZodError, z } from "zod";
import { jwtVerify } from "../utils/auth";
import jwt from "jsonwebtoken";
import { ToolLtiTokenPayload } from "../types/toolLtiToken";
import usePlatformStorage from "../storage/platform";
import useIDTokenStorage, { getIDTokenStorageKey } from "../storage/idToken";

const createScoreBodySchema = z.object({
  score: z.number(),
  resourceId: z.number(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { jwtSecret } = useRuntimeConfig();

  let score;
  try {
    ({ score } = await createScoreBodySchema.parseAsync(body));
  } catch (error: any) {
    console.error("Error parsing create score body", error);
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

  const Authorization = getHeader(event, "Authorization");
  const schema = Authorization?.split(" ")[0];
  const token = Authorization?.split(" ")[1];
  if (schema !== "Bearer") {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid schema",
    });
  }
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Token not found",
    });
  }

  let toolToken;
  try {
    toolToken = await jwtVerify(token, jwtSecret);
  } catch (error) {
    console.error("Error validating tool token", error);
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

  const { clientId, platformUrl, deploymentId, userId } =
    toolToken as ToolLtiTokenPayload;

  const platformStorage = usePlatformStorage();
  const platform = await platformStorage.getItem(`${platformUrl}:${clientId}`);
  if (!platform) {
    throw createError({
      statusCode: 404,
      statusMessage: "Platform not found",
    });
  }

  const idTokenStorage = useIDTokenStorage();
  const idToken = await idTokenStorage.getItem(
    getIDTokenStorageKey({
      issuer: platformUrl,
      clientId,
      deploymentId,
      userId,
    })
  );
  if (!idToken) {
    throw createError({
      statusCode: 404,
      statusMessage: "ID token not found",
    });
  }

  const { accessToken, tokenType } = await getAccessToken(platform, [
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/score",
  ]);

  const payload = {
    timestamp: new Date(),
    scoreGiven: score,
    scoreMaximum: 100,
    activityProgress: "Completed",
    gradingProgress: "FullyGraded",
    userId,
  };

  const scoreUrl = new URL(
    idToken["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"].lineitem
  );
  scoreUrl.pathname = `${scoreUrl.pathname}/scores`;
  await $fetch(scoreUrl.href, {
    method: "POST",
    headers: {
      Authorization: `${tokenType} ${accessToken}`,
      "Content-Type": "application/vnd.ims.lis.v1.score+json",
    },
    body: payload,
  });
});
