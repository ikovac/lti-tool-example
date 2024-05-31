import { ZodError, z } from "zod";
import usePlatformStorage from "../storage/platform";
import usePrivateKeyStorage from "../storage/privateKey";
import { jwtVerify } from "../utils/auth";
import jwt from "jsonwebtoken";
import { ToolLtiTokenPayload } from "../types/toolLtiToken";
import useIDTokenStorage, { getIDTokenStorageKey } from "../storage/idToken";

const deepLinkResourceBodySchema = z.object({
  resourceId: z.number(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { jwtSecret } = useRuntimeConfig();
  let resourceId;
  try {
    ({ resourceId } = await deepLinkResourceBodySchema.parseAsync(body));
  } catch (error: any) {
    console.error("Error parsing deep link resource body", error);
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

  const searchParams = new URLSearchParams();
  searchParams.append("resourceId", resourceId.toString());

  const item = {
    type: "ltiResourceLink",
    title: "Lti Tool Demo",
    custom: {
      resource_id: resourceId,
    },
    lineItem: {
      scoreMaximum: 100,
      resourceId,
    },
  };

  const jwtBody = {
    iss: clientId,
    aud: platformUrl,
    nonce: encodeURIComponent(
      [...Array(25)]
        .map((_) => ((Math.random() * 36) | 0).toString(36))
        .join("")
    ),
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": deploymentId,
    "https://purl.imsglobal.org/spec/lti/claim/message_type":
      "LtiDeepLinkingResponse",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": [item],
  };

  const platformStorage = usePlatformStorage();
  const platform = await platformStorage.getItem(`${platformUrl}:${clientId}`);
  if (!platform) {
    throw createError({
      statusCode: 404,
      statusMessage: "Platform not found",
    });
  }

  const privateKeyStorage = usePrivateKeyStorage();
  const platformPrivateKey = await privateKeyStorage.getItem(platform.kid);
  if (!platformPrivateKey) {
    throw createError({
      statusCode: 404,
      statusMessage: "Platform private key not found",
    });
  }

  const message = jwt.sign(jwtBody, platformPrivateKey, {
    algorithm: "RS256",
    expiresIn: 60,
    keyid: platform.kid,
  });

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

  const returnUrl =
    idToken[
      "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings"
    ]?.deep_link_return_url;
  appendResponseHeaders(event, {
    "content-type": "text/html",
  });
  return `<form id="ltijs_submit" style="display: none;" action="${returnUrl}" method="POST">
            <input type="hidden" name="JWT" value="${message}" />
          </form>
          <script>
            document.getElementById("ltijs_submit").submit()
          </script>`;
});
