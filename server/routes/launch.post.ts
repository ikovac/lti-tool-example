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

const launchBodySchema = z.object({
  id_token: z.string(),
  state: z.string(),
});

export default defineEventHandler(async (event) => {
  const { serverUrl } = useRuntimeConfig();
  const body = await readBody(event);
  let idToken, state;
  try {
    ({ id_token: idToken, state } = await launchBodySchema.parseAsync(body));
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

  const resourceId =
    tokenPayload["https://purl.imsglobal.org/spec/lti/claim/custom"]
      .resource_id;
  if (!resourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Resource ID not found",
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
  const url = new URL(`resources/${resourceId}`, serverUrl);
  url.searchParams.append("lti", ltiToken);
  return sendRedirect(event, url.href);
});

/**
 * ID token:
 * { nonce: 'jzngaehbkn5ot81q0aa86od55',
  iat: 1716983501,
  exp: 1716983561,
  iss: 'https://sandbox.moodledemo.net',
  aud: 'dZrqhgxEFBATmzX',
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '4',
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://653t9qrh-3000.euw.devtunnels.ms/launch',
  sub: '4',
  'https://purl.imsglobal.org/spec/lti/claim/lis': { person_sourcedid: '', course_section_sourcedid: '' },
  'https://purl.imsglobal.org/spec/lti/claim/roles': [ 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner' ],
  'https://purl.imsglobal.org/spec/lti/claim/context': { id: '7', label: 'test3', title: 'Test score 2', type: [ 'CourseSection' ] },
  'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': { title: 'Lti Tool Demo', description: '', id: '4' },
  'https://purl.imsglobal.org/spec/lti-bo/claim/basicoutcome':
   { lis_result_sourcedid:
      '{"data":{"instanceid":"4","userid":"4","typeid":"4","launchid":1046570349},"hash":"082df1e726aae8a55c5d00faf70c242deb8c4fda1c5e9b434749e3d7f94277f3"}',
     lis_outcome_service_url: 'https://sandbox.moodledemo.net/mod/lti/service.php' },
  given_name: 'Sam',
  family_name: 'Student',
  name: 'Sam Student',
  'https://purl.imsglobal.org/spec/lti/claim/ext': { user_username: 'student', lms: 'moodle-2' },
  email: 'student@moodle.a',
  'https://purl.imsglobal.org/spec/lti/claim/launch_presentation':
   { locale: 'en',
     document_target: 'iframe',
     return_url:
      'https://sandbox.moodledemo.net/mod/lti/return.php?course=7&launch_container=3&instanceid=4&sesskey=FvPXGD8bF4' },
  'https://purl.imsglobal.org/spec/lti/claim/tool_platform':
   { product_family_code: 'moodle',
     version: '2024042200',
     guid: '1f60aaf6991f55818465e52f3d2879b7',
     name: 'Sandbox 4.4',
     description: 'Moodle 4.4 sandbox demo' },
  'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
  'https://purl.imsglobal.org/spec/lti/claim/custom':
   { resourceid: '2',
     resourceId: '2',
     context_memberships_url:
      'https://sandbox.moodledemo.net/mod/lti/services.php/CourseSection/7/bindings/4/memberships' },
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint':
   { scope:
      [ 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/score' ],
     lineitems: 'https://sandbox.moodledemo.net/mod/lti/services.php/7/lineitems?type_id=4',
     lineitem:
      'https://sandbox.moodledemo.net/mod/lti/services.php/7/lineitems/19/lineitem?type_id=4' },
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice':
   { context_memberships_url:
      'https://sandbox.moodledemo.net/mod/lti/services.php/CourseSection/7/bindings/4/memberships',
     service_versions: [ '1.0', '2.0' ] } }

 */
